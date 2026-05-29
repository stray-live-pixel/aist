import {
  type AgentInstructionSource,
  createBaseAgentInstructionSource,
  sortAgentInstructionSources
} from '../../systemPrompt';
import type { GetFileAgentInstructionSourcesParams } from '../types';
import { getActiveInstructionSources } from './getActiveInstructionSources';
import { getActiveModeSource } from './getActiveModeSource';
import { getExternalInstructionSources } from './getExternalInstructionSources';
import { getFilePromptConfig } from './getFilePromptConfig';
import { getSkillInstructionSource } from './getSkillInstructionSource';

/**
 * Что это: собирает все источники system prompt из файловой конфигурации workspace.
 * Зачем нужно: daemon, headless CLI и диагностика должны видеть одинаковый порядок правил агента.
 */
export function getFileAgentInstructionSources(params: GetFileAgentInstructionSourcesParams): AgentInstructionSource[] {
  const config = getFilePromptConfig({ workspaceRoot: params.workspaceRoot, homeDir: params.homeDir });
  const activeMode = getActiveModeSource({ config });
  const skillSource = getSkillInstructionSource({ skills: params.skills || [] });

  return sortAgentInstructionSources([
    createBaseAgentInstructionSource(),
    ...getExternalInstructionSources({ workspaceRoot: params.workspaceRoot }),
    ...getActiveInstructionSources({ config }),
    ...(activeMode ? [activeMode] : []),
    ...(skillSource ? [skillSource] : [])
  ]);
}
