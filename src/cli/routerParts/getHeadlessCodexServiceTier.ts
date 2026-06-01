import { FileBackedConfigStore } from '../../core/app/config/config';
import { type CodexServiceTier } from '../../core/shared/types/types';
import { getStringSetting } from './getStringSetting';

export async function getHeadlessCodexServiceTier(configStore: FileBackedConfigStore): Promise<CodexServiceTier> {
  const value = await getStringSetting(configStore, ['openrouterAgent.codexServiceTier', 'codexServiceTier']);
  return value === 'priority' ? 'priority' : 'auto';
}
