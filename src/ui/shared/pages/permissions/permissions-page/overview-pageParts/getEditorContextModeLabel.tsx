import type { useI18n } from '../../../../i18n';
import type { EditorContextMode } from '../../../../types';

type Translate = ReturnType<typeof useI18n>['t'];

/**
 * Что это: человекочитаемая подпись режима контекста редактора.
 * Зачем нужно: значения auto/selection/file/off сами по себе не объясняют, что попадёт в запрос.
 * Какую продуктовую проблему решает: пользователь понимает, какие данные редактора агент увидит автоматически.
 */
export function getEditorContextModeLabel({ mode, t }: { mode: EditorContextMode; t: Translate }): string {
  if (mode === 'auto') return t('settings.overview.editorContext.auto');
  if (mode === 'selection') return t('settings.overview.editorContext.selection');
  if (mode === 'file') return t('settings.overview.editorContext.file');

  return t('settings.overview.editorContext.off');
}
