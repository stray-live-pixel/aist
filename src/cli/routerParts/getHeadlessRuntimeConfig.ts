import { FileBackedConfigStore } from '../../core/app/config/config';
import { type AgentRuntimeConfigSnapshot } from '../../core/app/runtime/agentRuntime';
import { getBooleanSetting } from './getBooleanSetting';
import { getNumberSetting } from './getNumberSetting';
import { getStringArraySetting } from './getStringArraySetting';

export async function getHeadlessRuntimeConfig(
  configStore: FileBackedConfigStore
): Promise<AgentRuntimeConfigSnapshot> {
  return {
    maxToolIterations: Math.max(
      0,
      Math.floor(await getNumberSetting(configStore, ['openrouterAgent.maxToolIterations', 'maxToolIterations'], 0))
    ),
    streamingEnabled: await getBooleanSetting(
      configStore,
      ['openrouterAgent.streamingEnabled', 'streamingEnabled'],
      false
    ),
    toolCallNotesRequired: await getBooleanSetting(
      configStore,
      ['openrouterAgent.toolCallNotesRequired', 'toolCallNotesRequired'],
      true
    ),
    disabledProjectToolIds: await getStringArraySetting(configStore, [
      'openrouterAgent.projectToolDisabledIds',
      'projectToolDisabledIds'
    ])
  };
}
