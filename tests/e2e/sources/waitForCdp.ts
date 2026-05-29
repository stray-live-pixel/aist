import type { ChildProcess } from 'node:child_process';

/**
 * Что это: ждёт, пока VS Code откроет Chrome DevTools Protocol endpoint.
 * Зачем нужно: Playwright подключается к реальному workbench через CDP, а не через mock страницы.
 */
export async function waitForCdp({
  port,
  process,
  logs,
  timeout = 60_000
}: {
  port: number;
  process: ChildProcess;
  logs: () => string;
  timeout?: number;
}): Promise<void> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    // Запускаем VS Code через CLI wrapper: wrapper может завершиться раньше Electron-приложения,
    // поэтому не считаем exitCode процессa достаточной причиной остановить ожидание CDP.
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        return;
      }
    } catch {
      // VS Code ещё не открыл debugging endpoint.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for VS Code CDP on port ${port}.\n${logs()}`);
}
