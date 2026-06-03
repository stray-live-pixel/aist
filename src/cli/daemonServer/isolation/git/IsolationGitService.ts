import fs from 'node:fs';
import path from 'node:path';

import { safeMkdir } from '../../../../core/entities/storage/storage';
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

export class IsolationGitService {
  constructor(
    private readonly options: {
      readonly workspaceRoot: string;
      readonly worktreesRoot: string;
      readonly env?: Record<string, string | undefined>;
    }
  ) {}

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

    await onStage?.('committing', 'Creating git commit.');
    await this.git({ cwd: worktreePath, args: ['add', '-A'] });
    await this.git({
      cwd: worktreePath,
      args: ['commit', '-m', createCommitMessage({ prompt, sessionId })]
    });
    const commitSha = await this.revParse({ cwd: worktreePath, ref: 'HEAD' });

    if (remoteName) {
      await onStage?.('pushing', `Pushing branch to ${remoteName}.`);
      await this.git({ cwd: worktreePath, args: ['push', '-u', remoteName, branchName] });
    }

    let prResult: Pick<IsolationGitFinalizeResult, 'prUrl' | 'prError'> = {};
    if (remoteName) {
      await onStage?.('creating_pr', 'Creating or reading pull request.');
      prResult = await this.createOrReadPullRequest({ worktreePath, branchName }).then(
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

  private async createOrReadPullRequest({
    worktreePath,
    branchName
  }: {
    worktreePath: string;
    branchName: string;
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
      args: ['pr', 'create', '--fill', '--head', branchName],
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

function createCommitMessage({ prompt, sessionId }: { prompt: string; sessionId: string }): string {
  const firstLine = prompt.replace(/\s+/g, ' ').trim().slice(0, 72);
  return `${firstLine || 'AIST isolated agent changes'}\n\nAIST isolated session: ${sessionId}`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, '-');
}
