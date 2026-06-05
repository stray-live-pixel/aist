import { pluralKey, translate } from '../../../i18n';
import { type AgentLanguage } from '../../../types';

export function translateChatMetaMessage(language: AgentLanguage, count: number): string {
  return translate(language, pluralKey(language, 'chatList.message', count), { count });
}
