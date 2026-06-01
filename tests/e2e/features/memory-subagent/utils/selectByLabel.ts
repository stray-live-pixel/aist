import type { Frame } from '@playwright/test';

/**
 * Что это: выбирает значение в кастомном Select дизайн-системы по его label.
 * Зачем нужно: настройки memory-субагента используют не native select, а webview control с portal dropdown.
 */
export async function selectByLabel(input: { webview: Frame; label: string; optionName: string }): Promise<void> {
  await input.webview.getByRole('button', { name: input.label }).click();
  await input.webview.getByRole('option', { name: input.optionName }).click();
}
