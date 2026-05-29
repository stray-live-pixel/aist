import type { Browser, Page } from '@playwright/test';

/**
 * Что это: находит страницу настоящего VS Code workbench среди CDP pages.
 * Зачем нужно: e2e работает с реальным интерфейсом VS Code, где webview расширения появится внутри workbench.
 */
export async function waitForWorkbenchPage({
  browser,
  timeout = 60_000
}: {
  browser: Browser;
  timeout?: number;
}): Promise<Page> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    for (const context of browser.contexts()) {
      for (const page of context.pages()) {
        if (page.isClosed()) {
          continue;
        }

        if (
          (await page
            .locator('.monaco-workbench')
            .count()
            .catch(() => 0)) > 0
        ) {
          await page.locator('.monaco-workbench').waitFor({ state: 'visible', timeout: 10_000 });
          return page;
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('Timed out waiting for the VS Code workbench page.');
}
