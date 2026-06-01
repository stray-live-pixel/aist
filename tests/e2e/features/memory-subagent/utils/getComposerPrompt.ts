import type { Frame, Locator } from '@playwright/test';

const composerPlaceholder = 'Попросите агента проверить, создать, изменить или удалить файлы проекта...';

/**
 * Что это: находит активное поле ввода Composer в webview.
 * Зачем нужно: во время анимаций рядом может быть readonly-копия, а тест должен писать в живой textarea.
 */
export function getComposerPrompt({ webview }: { webview: Frame }): Locator {
  return webview.locator(`textarea[placeholder="${composerPlaceholder}"]:not([readonly])`);
}
