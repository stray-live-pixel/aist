import type { Page } from '@playwright/test';

/**
 * Что это: закрывает окно VS Code workbench через CDP-страницу Playwright.
 * Зачем нужно: connectOverCDP закрывает только соединение Playwright, поэтому само тестовое окно VS Code нужно закрывать явно.
 */
export async function closeWorkbenchWindow({ page }: { page: Page }): Promise<void> {
  if (page.isClosed()) {
    return;
  }

  await page.close({ runBeforeUnload: true }).catch(() => undefined);
  await page.waitForEvent('close', { timeout: 5_000 }).catch(() => undefined);
}
