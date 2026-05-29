import { type Frame, type Page, expect } from '@playwright/test';

import { openAistChat } from './openAistChat';

/**
 * Что это: открывает страницу настроек AIST через реальную кнопку в composer.
 * Зачем нужно: settings e2e проверяют пользовательский путь из чата, а не внутреннее переключение React state.
 * Какую продуктовую проблему решает: если кнопка настроек или переход на страницу сломаются, screenshot-тесты разделов сразу это поймают.
 */
export async function openAistSettings({ page }: { page: Page }): Promise<Frame> {
  const webview = await openAistChat({ page });

  await webview.getByTitle('Открыть настройки агента').last().click();
  await expect(webview.getByRole('heading', { name: 'Обзор' })).toBeVisible({ timeout: 15_000 });

  return webview;
}
