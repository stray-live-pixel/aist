import type {
  ChatModelSettings,
  CodexServiceTier,
  EditorContextMode,
  ReasoningEffort
} from '../../core/shared/types/types';

/**
 * Что это: нормализует model settings чата с fallback значениями.
 * Зачем нужно: daemon принимает частичные настройки из UI/CLI и должен сохранить валидный объект.
 * Какую продуктовую проблему решает: некорректные или пустые поля не ломают запуск модели.
 */
export function normalizeChatModelSettings({
  value,
  fallback
}: {
  value: unknown;
  fallback: ChatModelSettings;
}): ChatModelSettings {
  const record = value && typeof value === 'object' ? (value as Partial<ChatModelSettings>) : {};
  const reasoningEffort: ReasoningEffort =
    record.reasoningEffort === 'low' ||
    record.reasoningEffort === 'medium' ||
    record.reasoningEffort === 'high' ||
    record.reasoningEffort === 'xhigh'
      ? record.reasoningEffort
      : 'auto';
  const codexServiceTier: CodexServiceTier = record.codexServiceTier === 'priority' ? 'priority' : 'auto';
  const editorContextMode: EditorContextMode =
    record.editorContextMode === 'selection' ||
    record.editorContextMode === 'file' ||
    record.editorContextMode === 'off'
      ? record.editorContextMode
      : 'auto';
  return {
    model: typeof record.model === 'string' && record.model.trim() ? record.model : fallback.model,
    reasoningEffort,
    codexServiceTier,
    maxToolIterations: Math.max(0, Math.floor(Number(record.maxToolIterations) || 0)),
    editorContextMode,
    streamingEnabled: record.streamingEnabled === true
  };
}
