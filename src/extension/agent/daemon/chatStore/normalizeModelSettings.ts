import type { ChatModelSettings } from '../../../chats/types';

/**
 * Что это: приводит произвольные modelSettings к полному extension-формату.
 * Зачем нужно: daemon state и старые persisted chats могут не содержать новые поля настроек.
 * Какую проблему решает: UI всегда получает валидные reasoning/serviceTier/context/streaming настройки.
 */
export function normalizeModelSettings({
  value,
  fallback
}: {
  value: unknown;
  fallback: ChatModelSettings;
}): ChatModelSettings {
  const settings = value && typeof value === 'object' ? (value as Partial<ChatModelSettings>) : {};
  return {
    model: typeof settings.model === 'string' && settings.model.trim() ? settings.model : fallback.model,
    reasoningEffort:
      settings.reasoningEffort === 'low' ||
      settings.reasoningEffort === 'medium' ||
      settings.reasoningEffort === 'high' ||
      settings.reasoningEffort === 'xhigh'
        ? settings.reasoningEffort
        : 'auto',
    codexServiceTier: settings.codexServiceTier === 'priority' ? 'priority' : 'auto',
    maxToolIterations: Math.max(0, Math.floor(Number(settings.maxToolIterations) || 0)),
    editorContextMode:
      settings.editorContextMode === 'selection' ||
      settings.editorContextMode === 'file' ||
      settings.editorContextMode === 'off'
        ? settings.editorContextMode
        : 'auto',
    streamingEnabled: settings.streamingEnabled === true,
    toolsDisabled: settings.toolsDisabled === true
  };
}
