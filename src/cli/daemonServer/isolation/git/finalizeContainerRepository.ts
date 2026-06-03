import type { IsolationGitFinalizeResult, IsolationGitFinalizeStage } from './IsolationGitService';
import type { LocalDockerIsolationProvider } from '../LocalDockerIsolationProvider';

/**
 * Что это: финализирует git changes внутри автономного контейнера.
 * Зачем нужно: commit/push/PR должны работать там же, где агент менял clone, без локального worktree.
 * Какую продуктовую проблему решает: isolated run можно перенести на удалённый Docker host и получить PR через тот же pipeline.
 */
export async function finalizeContainerRepository({
  dockerProvider,
  containerName,
  branchName,
  prompt,
  fallbackAnswer,
  sessionId,
  onStage
}: {
  dockerProvider: LocalDockerIsolationProvider;
  containerName: string;
  branchName: string;
  prompt: string;
  fallbackAnswer?: string;
  sessionId: string;
  onStage?: (stage: IsolationGitFinalizeStage, message: string) => Promise<void>;
}): Promise<IsolationGitFinalizeResult> {
  const changed = await hasContainerChanges({ dockerProvider, containerName });
  let fallbackArtifactPath: string | undefined;
  if (!changed) {
    fallbackArtifactPath = `docs/aist-isolated-runs/${sessionId}.md`;
    await writeFallbackArtifact({ dockerProvider, containerName, prompt, fallbackAnswer, sessionId });
    await onStage?.('committing', `Created fallback review artifact ${fallbackArtifactPath}.`);
  }

  const changedAfterFallback = await hasContainerChanges({ dockerProvider, containerName });
  if (!changedAfterFallback) {
    const headSha = await revParse({ dockerProvider, containerName, ref: 'HEAD' });
    const prResult = await createOrReadPullRequest({ dockerProvider, containerName, branchName });
    return { changed: false, headSha, pushed: false, ...prResult };
  }

  await onStage?.('committing', 'Creating git commit inside autonomous container.');
  await execRequired({ dockerProvider, containerName, script: 'git add -A' });
  await execRequired({
    dockerProvider,
    containerName,
    script: `git commit -m ${shellQuote(createCommitMessage({ prompt, sessionId }))}`
  });
  const commitSha = await revParse({ dockerProvider, containerName, ref: 'HEAD' });

  await onStage?.('pushing', 'Pushing branch from autonomous container.');
  const pushResult = await dockerProvider.exec({
    container: containerName,
    script: `git push -u origin ${shellQuote(branchName)}`,
    cwd: '/workspace',
    timeoutMs: 5 * 60 * 1000,
    maxOutputChars: 120000
  });
  const pushed = pushResult.ok;

  let prResult: Pick<IsolationGitFinalizeResult, 'prUrl' | 'prError'> = {};
  if (pushed) {
    await onStage?.('creating_pr', 'Creating or reading pull request from autonomous container.');
    prResult = await createOrReadPullRequest({ dockerProvider, containerName, branchName });
  } else {
    prResult = { prError: pushResult.stderr || pushResult.stdout || 'git push failed' };
  }

  return {
    changed: true,
    fallbackArtifactPath,
    commitSha,
    headSha: commitSha,
    pushed,
    ...prResult
  };
}

async function hasContainerChanges({
  dockerProvider,
  containerName
}: {
  dockerProvider: LocalDockerIsolationProvider;
  containerName: string;
}): Promise<boolean> {
  const result = await dockerProvider.exec({
    container: containerName,
    script: 'git status --porcelain',
    cwd: '/workspace',
    timeoutMs: 120000,
    maxOutputChars: 20000
  });
  if (!result.ok) {
    throw new Error(`git status failed: ${result.stderr || result.stdout || 'unknown error'}`);
  }
  return Boolean(result.stdout.trim());
}

async function writeFallbackArtifact({
  dockerProvider,
  containerName,
  prompt,
  fallbackAnswer,
  sessionId
}: {
  dockerProvider: LocalDockerIsolationProvider;
  containerName: string;
  prompt: string;
  fallbackAnswer?: string;
  sessionId: string;
}): Promise<void> {
  const content = [
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
  ].join('\n');
  await execRequired({
    dockerProvider,
    containerName,
    script: [
      'mkdir -p docs/aist-isolated-runs',
      `cat > ${shellQuote(`docs/aist-isolated-runs/${sanitizeFileName(sessionId)}.md`)} <<'AIST_FALLBACK_ARTIFACT'`,
      content,
      'AIST_FALLBACK_ARTIFACT'
    ].join('\n')
  });
}

async function createOrReadPullRequest({
  dockerProvider,
  containerName,
  branchName
}: {
  dockerProvider: LocalDockerIsolationProvider;
  containerName: string;
  branchName: string;
}): Promise<Pick<IsolationGitFinalizeResult, 'prUrl' | 'prError'>> {
  const existing = await dockerProvider.exec({
    container: containerName,
    script: `gh pr view ${shellQuote(branchName)} --json url --jq .url`,
    cwd: '/workspace',
    timeoutMs: 120000,
    maxOutputChars: 20000
  });
  const existingUrl = existing.stdout.trim();
  if (existing.ok && existingUrl) {
    return { prUrl: existingUrl };
  }

  const created = await dockerProvider.exec({
    container: containerName,
    script: `gh pr create --fill --head ${shellQuote(branchName)}`,
    cwd: '/workspace',
    timeoutMs: 120000,
    maxOutputChars: 40000
  });
  if (!created.ok) {
    return { prError: created.stderr || created.stdout || 'gh pr create failed' };
  }
  return {
    prUrl: created.stdout
      .trim()
      .split('\n')
      .find((line) => line.startsWith('http'))
  };
}

async function revParse({
  dockerProvider,
  containerName,
  ref
}: {
  dockerProvider: LocalDockerIsolationProvider;
  containerName: string;
  ref: string;
}): Promise<string> {
  const result = await dockerProvider.exec({
    container: containerName,
    script: `git rev-parse ${shellQuote(ref)}`,
    cwd: '/workspace',
    timeoutMs: 120000,
    maxOutputChars: 20000
  });
  if (!result.ok) {
    throw new Error(`git rev-parse failed: ${result.stderr || result.stdout || 'unknown error'}`);
  }
  return result.stdout.trim();
}

async function execRequired({
  dockerProvider,
  containerName,
  script
}: {
  dockerProvider: LocalDockerIsolationProvider;
  containerName: string;
  script: string;
}): Promise<void> {
  const result = await dockerProvider.exec({ container: containerName, script, cwd: '/workspace', maxOutputChars: 120000 });
  if (!result.ok) {
    throw new Error(`Container git command failed: ${result.stderr || result.stdout || 'unknown error'}`);
  }
}

function createCommitMessage({ prompt, sessionId }: { prompt: string; sessionId: string }): string {
  const firstLine = prompt.replace(/\s+/g, ' ').trim().slice(0, 72);
  return `${firstLine || 'AIST isolated agent changes'}\n\nAIST isolated session: ${sessionId}`;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]/g, '-');
}
