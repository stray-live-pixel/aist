import { execFileAsync } from './execFileAsync';

/**
 * Что это: определяет GitHub URL, из которого автономный контейнер сможет клонировать workspace repo.
 * Зачем нужно: isolated Docker больше не получает локальный worktree через volume mount.
 * Какую продуктовую проблему решает: агент запускается в переносимой среде и готов к будущему remote Docker/server backend.
 */
export async function getIsolationRepositoryUrl({
  workspaceRoot,
  remoteName = 'origin',
  env
}: {
  workspaceRoot: string;
  remoteName?: string;
  env?: Record<string, string | undefined>;
}): Promise<string> {
  const result = await execFileAsync({
    file: 'git',
    args: ['remote', 'get-url', remoteName],
    cwd: workspaceRoot,
    env
  });
  const repositoryUrl = result.stdout.trim();
  if (!repositoryUrl) {
    throw new Error(`Git remote ${remoteName} does not have an URL.`);
  }
  return repositoryUrl;
}
