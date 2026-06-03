import { execFileAsync } from './execFileAsync';

/**
 * Что это: читает SHA базового ref в локальном git checkout только как metadata.
 * Зачем нужно: UI показывает стартовую точку сессии, но код агента берётся уже из контейнерного clone.
 * Какую продуктовую проблему решает: пользователь видит полезный audit trail без привязки выполнения к локальным файлам.
 */
export async function getIsolationBaseSha({
  workspaceRoot,
  baseRef,
  env
}: {
  workspaceRoot: string;
  baseRef: string;
  env?: Record<string, string | undefined>;
}): Promise<string | undefined> {
  const result = await execFileAsync({ file: 'git', args: ['rev-parse', baseRef], cwd: workspaceRoot, env }).catch(
    () => undefined
  );
  return result?.stdout.trim() || undefined;
}
