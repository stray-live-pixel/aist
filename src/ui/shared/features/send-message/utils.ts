export { getShiftDropFullPaths } from './getShiftDropFullPaths';
export { insertTextIntoPrompt } from './insertTextIntoPrompt';
export type { ComposerDropDataTransfer, PromptTextInsertion } from './dropTypes';

/** Максимальная высота поля ввода: выше пользователь уже теряет обзор истории чата. */
export const MAX_TEXTAREA_HEIGHT = 300;

/** Prompt по умолчанию, когда пользователь нажал send на пустом поле для продолжения текущей задачи. */
export const DEFAULT_CONTINUE_PROMPT = 'Continue working. Continue with the current task';

/** Prompt по умолчанию, когда пользователь прикрепил файлы без текстового запроса. */
export const DEFAULT_ATTACHMENT_ANALYSIS_PROMPT = 'Analyze the attached files and images.';

/**
 * Что это: авторасчёт высоты textarea по содержимому.
 * Зачем нужно: поле растёт без ручного resize, но ограничивается максимумом, чтобы composer не вытеснял историю сообщений.
 */
export function resizePromptField(textarea: HTMLTextAreaElement | null): void {
  if (!textarea) {
    return;
  }

  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
}

/**
 * Что это: определение платформы с Command-клавишей.
 * Зачем нужно: подсказка shortcut должна соответствовать привычной клавише macOS/iOS, а не всегда показывать Ctrl.
 */
export function isMacLikePlatform(): boolean {
  const platform = navigator.platform || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}
