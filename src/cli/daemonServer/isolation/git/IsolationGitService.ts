import fs from 'node:fs';
import path from 'node:path';

import { safeMkdir } from '../../../../core/entities/storage/storage';
import type { AuxiliaryModelInvoker } from '../../../../core/entities/model/auxiliaryModel';
import { createIsolationGitMetadata, type IsolationGitMetadata } from './createIsolationGitMetadata';
import { execFileAsync } from './execFileAsync';

export type IsolationPreparedWorktree = {
  readonly repoRoot: string;
  readonly worktreePath: string;
  readonly branchName: string;
  readonly baseRef: string;
  readonly baseSha: string;
  readonly remoteName?: string;
};

export type IsolationGitFinalizeResult = {
  readonly changed: boolean;
  readonly fallbackArtifactPath?: string;
  readonly commitSha?: string;
  readonly headSha?: string;
  readonly pushed: boolean;
  readonly prUrl?: string;
  readonly prError?: string;
};

export type IsolationGitFinalizeStage = 'committing' | 'pushing' | 'creating_pr';

export type IsolationCloneSource = {
  readonly repoRoot: string;
  readonly remoteName?: string;
  readonly remoteUrl: string;
  readonly baseRef: string;
  readonly baseSha: string;
};

export class IsolationGitService {
  constructor(
    private readonly options: {
      readonly workspaceRoot: string;
      readonly worktreesRoot: string;
      readonly env?: Record<string, string | undefined>;
      readonly auxiliaryModel?: AuxiliaryModelInvoker;
    }
  ) {}

  async resolveCloneSource({
    baseRef,
    continueExisting,
    branchName
  }: {
    baseRef?: string;
    continueExisting: boolean;
    branchName: string;
  }): Promise<IsolationCloneSource> {
    const repoRoot = await this.getRepoRoot();
    const remoteName = await this.getRemoteName(repoRoot);
    const remoteUrl = remoteName ? await this.getRemoteUrl({ repoRoot, remoteName }) : undefined;
    if (!remoteName || !remoteUrl) {
      throw new Error('Isolated container mode requires a git remote with a GitHub clone URL.');
    }
    const effectiveBaseRef = baseRef || (continueExisting ? branchName : 'HEAD');
    const baseSha = await this.revParse({ cwd: repoRoot, ref: effectiveBaseRef }).catch(() =>
      this.revParse({ cwd: repoRoot, ref: 'HEAD' })
    );
    return { repoRoot, remoteName, remoteUrl, baseRef: effectiveBaseRef, baseSha };
  }

  async prepareWorktree({
    sessionId,
    branchName,
    baseRef,
    continueExisting
  }: {
    sessionId: string;
    branchName: string;
    baseRef?: string;
    continueExisting: boolean;
  }): Promise<IsolationPreparedWorktree> {
    const repoRoot = await this.getRepoRoot();
    const remoteName = await this.getRemoteName(repoRoot);
    const effectiveBaseRef = baseRef || (continueExisting ? branchName : 'HEAD');
    const worktreePath = path.join(this.options.worktreesRoot, sessionId);
    await safeMkdir(this.options.worktreesRoot);
    await this.removeWorktreeIfExists({ repoRoot, worktreePath });

    if (await this.localBranchExists({ repoRoot, branchName })) {
      await this.git({ cwd: repoRoot, args: ['worktree', 'add', worktreePath, branchName] });
    } else {
      await this.git({ cwd: repoRoot, args: ['worktree', 'add', '-B', branchName, worktreePath, effectiveBaseRef] });
    }

    const baseSha = await this.revParse({ cwd: worktreePath, ref: 'HEAD' });
    return {
      repoRoot,
      worktreePath,
      branchName,
      baseRef: effectiveBaseRef,
      baseSha,
      remoteName
    };
  }

  async finalize({
    worktreePath,
    branchName,
    remoteName,
    prompt,
    fallbackAnswer,
    sessionId,
    onStage
  }: {
    worktreePath: string;
    branchName: string;
    remoteName?: string;
    prompt: string;
    fallbackAnswer?: string;
    sessionId: string;
    onStage?: (stage: IsolationGitFinalizeStage, message: string) => Promise<void>;
  }): Promise<IsolationGitFinalizeResult> {
    let changed = await this.hasChanges(worktreePath);
    let fallbackArtifactPath: string | undefined;
    if (!changed) {
      fallbackArtifactPath = await this.writeFallbackArtifact({ worktreePath, prompt, fallbackAnswer, sessionId });
      changed = await this.hasChanges(worktreePath);
      if (changed) {
        await onStage?.('committing', `Created fallback review artifact ${fallbackArtifactPath}.`);
      }
    }
    if (!changed) {
      const headSha = await this.revParse({ cwd: worktreePath, ref: 'HEAD' });
      if (remoteName) {
        await onStage?.('creating_pr', 'Creating or reading pull request.');
      }
      const prResult = remoteName
        ? await this.createOrReadPullRequest({ worktreePath, branchName }).then(
            (prUrl) => ({ prUrl }),
            (error) => ({ prError: formatError(error) })
          )
        : {};
      return { changed: false, headSha, pushed: false, ...prResult };
    }

    await onStage?.('committing', 'Preparing commit and pull request metadata.');
    const statusSummary = await this.getStatusSummary({ worktreePath });
    await this.git({ cwd: worktreePath, args: ['add', '-A'] });
    const diffSummary = await this.getStagedDiffSummary({ worktreePath });
    const gitMetadata = await createIsolationGitMetadata({
      auxiliaryModel: this.options.auxiliaryModel,
      prompt,
      fallbackAnswer,
      diffSummary,
      statusSummary,
      sessionId
    });
    await this.git({
      cwd: worktreePath,
      args: ['commit', '-m', gitMetadata.commitMessage]
    });
    const commitSha = await this.revParse({ cwd: worktreePath, ref: 'HEAD' });

    if (remoteName) {
      await onStage?.('pushing', `Pushing branch to ${remoteName}.`);
      await this.git({ cwd: worktreePath, args: ['push', '-u', remoteName, branchName] });
    }

    let prResult: Pick<IsolationGitFinalizeResult, 'prUrl' | 'prError'> = {};
    if (remoteName) {
      await onStage?.('creating_pr', 'Creating or reading pull request.');
      prResult = await this.createOrReadPullRequest({ worktreePath, branchName, gitMetadata }).then(
        (prUrl) => ({ prUrl }),
        (error) => ({ prError: formatError(error) })
      );
    }

    return {
      changed: true,
      fallbackArtifactPath,
      commitSha,
      headSha: commitSha,
      pushed: Boolean(remoteName),
      ...prResult
    };
  }

  async removeWorktree(worktreePath: string): Promise<void> {
    const repoRoot = await this.getRepoRoot().catch(() => undefined);
    if (repoRoot) {
      await this.git({ cwd: repoRoot, args: ['worktree', 'remove', '--force', worktreePath] }).catch(() => undefined);
    }
    await fs.promises.rm(worktreePath, { recursive: true, force: true }).catch(() => undefined);
  }

  private async getRepoRoot(): Promise<string> {
    const result = await this.git({ cwd: this.options.workspaceRoot, args: ['rev-parse', '--show-toplevel'] });
    return result.stdout.trim();
  }

  private async getRemoteName(repoRoot: string): Promise<string | undefined> {
    const result = await this.git({ cwd: repoRoot, args: ['remote'] }).catch(() => undefined);
    const remotes = result?.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return remotes?.includes('origin') ? 'origin' : remotes?.[0];
  }

  private async getRemoteUrl({ repoRoot, remoteName }: { repoRoot: string; remoteName: string }): Promise<string | undefined> {
    const result = await this.git({ cwd: repoRoot, args: ['remote', 'get-url', remoteName] }).catch(() => undefined);
    return result?.stdout.trim() || undefined;
  }

  private async removeWorktreeIfExists({
    repoRoot,
    worktreePath
  }: {
    repoRoot: string;
    worktreePath: string;
  }): Promise<void> {
    if (!fs.existsSync(worktreePath)) {
      return;
    }
    await this.git({ cwd: repoRoot, args: ['worktree', 'remove', '--force', worktreePath] }).catch(() => undefined);
    await fs.promises.rm(worktreePath, { recursive: true, force: true });
  }

  private async localBranchExists({
    repoRoot,
    branchName
  }: {
    repoRoot: string;
    branchName: string;
  }): Promise<boolean> {
    return this.git({ cwd: repoRoot, args: ['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`] })
      .then(() => true)
      .catch(() => false);
  }

  private async hasChanges(worktreePath: string): Promise<boolean> {
    const result = await this.git({ cwd: worktreePath, args: ['status', '--porcelain'] });
    return Boolean(result.stdout.trim());
  }

  private async revParse({ cwd, ref }: { cwd: string; ref: string }): Promise<string> {
    const result = await this.git({ cwd, args: ['rev-parse', ref] });
    return result.stdout.trim();
  }

  private async getStatusSummary({ worktreePath }: { worktreePath: string }): Promise<string> {
    const result = await this.git({ cwd: worktreePath, args: ['status', '--short'] });
    return result.stdout.trim();
  }

  private async getStagedDiffSummary({ worktreePath }: { worktreePath: string }): Promise<string> {
    const result = await this.git({ cwd: worktreePath, args: ['diff', '--cached', '--stat', '--summary'] });
    return truncateDiffSummary({ value: result.stdout });
  }

  private async createOrReadPullRequest({
    worktreePath,
    branchName,
    gitMetadata
  }: {
    worktreePath: string;
    branchName: string;
    gitMetadata?: IsolationGitMetadata;
  }): Promise<string | undefined> {
    const existing = await execFileAsync({
      file: 'gh',
      args: ['pr', 'view', branchName, '--json', 'url', '--jq', '.url'],
      cwd: worktreePath,
      env: this.options.env
    }).catch(() => undefined);
    const existingUrl = existing?.stdout.trim();
    if (existingUrl) {
      return existingUrl;
    }

    const created = await execFileAsync({
      file: 'gh',
      args: gitMetadata
        ? ['pr', 'create', '--head', branchName, '--title', gitMetadata.prTitle, '--body', gitMetadata.prBody]
        : ['pr', 'create', '--fill', '--head', branchName],
      cwd: worktreePath,
      env: this.options.env
    });
    return created.stdout
      .trim()
      .split('\n')
      .find((line) => line.startsWith('http'));
  }

  private git({ cwd, args }: { cwd: string; args: readonly string[] }) {
    return execFileAsync({ file: 'git', args, cwd, env: this.options.env });
  }

  private async writeFallbackArtifact({
    worktreePath,
    prompt,
    fallbackAnswer,
    sessionId
  }: {
    worktreePath: string;
    prompt: string;
    fallbackAnswer?: string;
    sessionId: string;
  }): Promise<string> {
    const artifactDir = path.join(worktreePath, 'docs', 'aist-isolated-runs');
    await safeMkdir(artifactDir);
    const artifactPath = path.join(artifactDir, `${sanitizeFileName(sessionId)}.md`);
    await fs.promises.writeFile(
      artifactPath,
      [
        '# AIST isolated run result',
        '',
        `Session: ${sessionId}`,
        `Created at: ${new Date().toISOString()}`,
        '',
        '## User task',
        '',
        prompt.trim() || '(empty prompt)',
        '',
        '## Agent answer',
        '',
        fallbackAnswer?.trim() || 'The isolated agent completed without a final text answer.',
        ''
      ].join('\n'),
      'utf8'
    );
    return path.relative(worktreePath, artifactPath);
  }
}

function truncateDiffSummary({ value }: { value: string }): string {
  const maxLength = 20000;
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n\n[diff truncated for git metadata generation]`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, '-');
}
