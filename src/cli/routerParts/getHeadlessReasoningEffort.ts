import { FileBackedConfigStore } from '../../core/app/config/config';
import { type ReasoningEffort } from '../../core/shared/types/types';
import { getStringSetting } from './getStringSetting';

export async function getHeadlessReasoningEffort(configStore: FileBackedConfigStore): Promise<ReasoningEffort> {
  const value = await getStringSetting(configStore, ['openrouterAgent.reasoningEffort', 'reasoningEffort']);
  return value === 'low' || value === 'medium' || value === 'high' || value === 'xhigh' ? value : 'auto';
}
