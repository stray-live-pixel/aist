import type { ChatModelSettings } from '../../../chats/types';

/**
 * Что это: создаёт безопасные настройки модели для нового daemon-чата.
 * Зачем нужно: chat store должен иметь полный набор полей даже при одном model string.
 * Какую проблему решает: webview не получает частичные modelSettings после create/normalize.
 */
export function createDefaultModelSettings({ model }: { model: string }): ChatModelSettings {
  return {
    model,
    reasoningEffort: 'auto',
    codexServiceTier: 'auto',
    maxToolIterations: 0,
    editorContextMode: 'auto',
    streamingEnabled: false
  };
}
