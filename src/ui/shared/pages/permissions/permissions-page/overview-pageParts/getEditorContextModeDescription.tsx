import type { useI18n } from '../../../../i18n';
import type { EditorContextMode } from '../../../../types';

type Translate = ReturnType<typeof useI18n>['t'];

/**
 * Что это: короткое пояснение режима контекста редактора.
 * Зачем нужно: обзор должен объяснять влияние настройки, а не только показывать её название.
 * Какую продуктовую проблему решает: пользователь понимает, почему агент видит или не видит активный файл.
 */
export function getEditorContextModeDescription({ mode, t }: { mode: EditorContextMode; t: Translate }): string {
  if (mode === 'auto') return t('settings.overview.editorContext.autoDescription');
  if (mode === 'selection') return t('settings.overview.editorContext.selectionDescription');
  if (mode === 'file') return t('settings.overview.editorContext.fileDescription');

  return t('settings.overview.editorContext.offDescription');
}
