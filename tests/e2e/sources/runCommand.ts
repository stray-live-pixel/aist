import { type Page, expect } from '@playwright/test';

/**
 * Что это: открывает команду VS Code через Command Palette.
 * Зачем нужно: e2e повторяет путь пользователя, а не дергает внутренние API расширения.
 */
export async function runCommand({ page, commandTitle }: { page: Page; commandTitle: string }): Promise<void> {
  const shortcut = process.platform === 'darwin' ? 'Meta+Shift+P' : 'Control+Shift+P';

  await page.keyboard.press(shortcut);

  const commandInput = page.locator('.quick-input-widget input').first();
  await expect(commandInput).toBeVisible();
  await commandInput.fill(`>${commandTitle}`);
  await page.keyboard.press('Enter');
  await expect(commandInput).toBeHidden({ timeout: 15_000 });
}
