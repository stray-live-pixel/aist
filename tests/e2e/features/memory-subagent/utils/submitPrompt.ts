import type { Frame } from '@playwright/test';

import { getComposerPrompt } from './getComposerPrompt';

/**
 * Что это: отправляет сообщение пользователя через Composer shortcut.
 * Зачем нужно: тест проверяет реальный пользовательский путь, не вызывая внутренние API приложения.
 */
export async function submitPrompt({ webview, text }: { webview: Frame; text: string }): Promise<void> {
  const prompt = getComposerPrompt({ webview });
  await prompt.fill(text);
  await prompt.press(process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter');
}
