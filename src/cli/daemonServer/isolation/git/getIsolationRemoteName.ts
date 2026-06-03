import { execFileAsync } from './execFileAsync';

/**
 * Что это: выбирает git remote для автономной isolated session.
 * Зачем нужно: контейнеру нужен один source repo для clone и push.
 * Какую продуктовую проблему решает: запуск не зависит от локального worktree, но сохраняет привычный origin-first выбор.
 */
export async function getIsolationRemoteName({
  workspaceRoot,
  env
}: {
  workspaceRoot: string;
  env?: Record<string, string | undefined>;
}): Promise<string | undefined> {
  const result = await execFileAsync({ file: 'git', args: ['remote'], cwd: workspaceRoot, env }).catch(() => undefined);
  const remotes = result?.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return remotes?.includes('origin') ? 'origin' : remotes?.[0];
}
