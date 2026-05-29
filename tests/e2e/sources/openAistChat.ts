import { type Frame, type Page } from '@playwright/test';

import { ensureAistWebviewMinWidth } from './ensureAistWebviewMinWidth';
import { findFrameByPlaceholder } from './findFrameByPlaceholder';
import { runCommand } from './runCommand';

/**
 * Что это: открывает чат AIST и возвращает iframe с React UI.
 * Зачем нужно: тесты пользовательских flow начинаются одинаково и остаются читаемыми.
 */
export async function openAistChat({ page }: { page: Page }): Promise<Frame> {
  const placeholder = 'Попросите агента проверить, создать, изменить или удалить файлы проекта...';
  const existingWebview = await findFrameByPlaceholder({ page, placeholder, timeout: 1_000 }).catch(() => undefined);
  const webview = existingWebview || (await openChatFrame({ page, placeholder }));

  await ensureAistWebviewMinWidth({ page, webview, minWidth: 800 });
  return webview;
}

/**
 * Что это: открывает AIST chat через Command Palette, когда webview ещё не найден.
 * Зачем нужно: повторные e2e сценарии не должны флейкать из-за лишнего открытия Command Palette поверх уже открытого чата.
 * Какую продуктовую проблему решает: тест остаётся пользовательским, но не дублирует навигацию, если пользователь уже находится в чате.
 */
async function openChatFrame({ page, placeholder }: { page: Page; placeholder: string }): Promise<Frame> {
  await runCommand({ page, commandTitle: 'aist: Open Chat' });
  return findFrameByPlaceholder({ page, placeholder });
}
