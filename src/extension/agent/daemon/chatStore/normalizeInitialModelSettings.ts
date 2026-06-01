import type { ChatModelSettings } from '../../../chats/types';
import { DEFAULT_MODEL } from '../../../shared/constants';
import { createDefaultModelSettings } from './createDefaultModelSettings';
import { normalizeModelSettings } from './normalizeModelSettings';

/**
 * Что это: принимает model string или полный settings object для нового local chat.
 * Зачем нужно: AgentChatStore API исторически поддерживает оба варианта createChat.
 * Какую проблему решает: createChat не дублирует правила default/fallback настроек модели.
 */
export function normalizeInitialModelSettings({
  settings
}: {
  settings: string | ChatModelSettings;
}): ChatModelSettings {
  return typeof settings === 'string'
    ? createDefaultModelSettings({ model: settings })
    : normalizeModelSettings({
        value: settings,
        fallback: createDefaultModelSettings({ model: settings.model || DEFAULT_MODEL })
      });
}
