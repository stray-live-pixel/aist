import { FileBackedConfigStore } from '../../core/app/config/config';
import { type AgentLanguage } from '../../core/features/system-prompt/prompts';
import { getStringSetting } from './getStringSetting';

export async function getHeadlessLanguage(configStore: FileBackedConfigStore): Promise<AgentLanguage> {
  const language = await getStringSetting(configStore, ['openrouterAgent.language', 'language']);
  return language === 'ru' ? 'ru' : 'en';
}
