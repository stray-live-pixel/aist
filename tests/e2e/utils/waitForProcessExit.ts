import type { ChildProcess } from 'node:child_process';

/**
 * Что это: ждёт завершения дочернего процесса ограниченное время.
 * Зачем нужно: после закрытия окна VS Code CLI wrapper с --wait должен завершиться сам, а e2e cleanup должен это подтвердить.
 */
export function waitForProcessExit({
  process,
  timeout = 5_000
}: {
  process: ChildProcess;
  timeout?: number;
}): Promise<boolean> {
  if (process.exitCode !== null || process.killed) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeout);

    const onExit = () => {
      cleanup();
      resolve(true);
    };

    const cleanup = () => {
      clearTimeout(timer);
      process.off('exit', onExit);
    };

    process.once('exit', onExit);
  });
}
