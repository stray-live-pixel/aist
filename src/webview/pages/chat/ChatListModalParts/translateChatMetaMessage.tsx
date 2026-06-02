import { pluralKey, translate } from '../../../shared/i18n';
import { type AgentLanguage } from '../../../shared/types';

export function translateChatMetaMessage(language: AgentLanguage, count: number): string {
  return translate(language, pluralKey(language, 'chatList.message', count), { count });
}
