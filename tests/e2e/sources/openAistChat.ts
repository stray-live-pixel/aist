import { type Frame, type Page } from '@playwright/test';

import { ensureAistWebviewMinWidth } from './ensureAistWebviewMinWidth';
import { findFrameByPlaceholder } from './findFrameByPlaceholder';
import { runCommand } from './runCommand';

/**
 * Что это: открывает чат AIST и возвращает iframe с React UI.
 * Зачем нужно: тесты пользовательских flow начинаются одинаково и остаются читаемыми.
 */
export async function openAistChat({ page }: { page: Page }): Promise<Frame> {
  await runCommand({ page, commandTitle: 'aist: Open Chat' });
  const webview = await findFrameByPlaceholder({
    page,
    placeholder: 'Попросите агента проверить, создать, изменить или удалить файлы проекта...'
  });

  await ensureAistWebviewMinWidth({ page, webview, minWidth: 800 });
  return webview;
}
