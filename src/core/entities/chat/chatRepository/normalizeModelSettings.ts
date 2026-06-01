import type { ChatModelSettings } from '../../../shared/types/types';

/**
 * Что это: нормализация model settings, сохранённых вместе с чатом.
 * Зачем нужно: старые или неполные настройки получают безопасные default-значения.
 * Какую продуктовую проблему решает: агент продолжает работать с понятной моделью и режимами после restart/upgrade.
 */
export function normalizeModelSettings({
  value,
  fallbackModel
}: {
  value: unknown;
  fallbackModel: string;
}): ChatModelSettings {
  const settings = value && typeof value === 'object' ? (value as Partial<ChatModelSettings>) : {};
  const model = typeof settings.model === 'string' && settings.model.trim() ? settings.model : fallbackModel;
  const reasoningEffort = normalizeReasoningEffort({ value: settings.reasoningEffort });
  const editorContextMode = normalizeEditorContextMode({ value: settings.editorContextMode });

  return {
    model: typeof model === 'string' && model.trim() ? model : 'unknown',
    reasoningEffort,
    codexServiceTier: settings.codexServiceTier === 'priority' ? 'priority' : 'auto',
    maxToolIterations: Math.max(0, Math.floor(Number(settings.maxToolIterations) || 0)),
    editorContextMode,
    streamingEnabled: settings.streamingEnabled === true
  };
}

/**
 * Что это: нормализация effort для reasoning-моделей.
 * Зачем нужно: persisted-файл может хранить устаревшее или ручное значение.
 * Какую продуктовую проблему решает: запрос к модели не падает из-за неизвестного effort.
 */
function normalizeReasoningEffort({ value }: { value: unknown }): ChatModelSettings['reasoningEffort'] {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'xhigh' || value === 'auto'
    ? value
    : 'auto';
}

/**
 * Что это: нормализация режима editor context.
 * Зачем нужно: чат должен открываться даже после изменения набора режимов контекста.
 * Какую продуктовую проблему решает: пользователь не теряет возможность продолжить диалог из-за старой настройки.
 */
function normalizeEditorContextMode({ value }: { value: unknown }): ChatModelSettings['editorContextMode'] {
  return value === 'selection' || value === 'file' || value === 'off' || value === 'auto' ? value : 'auto';
}
