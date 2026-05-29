import { type Frame, type Page, expect } from '@playwright/test';

import { openAistChat } from './openAistChat';

/**
 * Что это: открывает AIST chat и создаёт новый пустой чат через реальную кнопку UI.
 * Зачем нужно: полный e2e прогон использует один worker, поэтому история предыдущих tests не должна ломать empty-state и screenshot проверки.
 * Какую продуктовую проблему решает: тесты, которым важен чистый контекст, проверяют именно новый пользовательский чат, а не случайную историю прошлых сценариев.
 */
export async function openFreshAistChat({ page }: { page: Page }): Promise<Frame> {
  const webview = await openAistChat({ page });

  await webview.getByTitle('Новый чат').last().click();
  await expect(
    webview.getByPlaceholder('Попросите агента проверить, создать, изменить или удалить файлы проекта...').last()
  ).toBeVisible();

  return webview;
}
