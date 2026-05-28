import {
  buildAgentSystemPrompt as buildCoreAgentSystemPrompt,
  createBaseAgentInstructionSource,
  sortAgentInstructionSources
} from '../../../core/features/system-prompt/systemPrompt';
import { getAgentSkills } from '../../skills/skills';
import { type AgentInstructionSource, getExternalInstructionSources, getPromptConfig } from './agentConfigStore';
import { getAgentLanguage } from './settings';

/**
 * Собирает источники инструкций в том же порядке, в котором они попадают в prompt.
 * Локальные инструкции проекта имеют больший priority, чем глобальные.
 */
export function getAgentInstructionSources(): AgentInstructionSource[] {
  const config = getPromptConfig();
  const skills = getAgentSkills();
  const activeInstructions = config.activeInstructionRefs
    .map((ref, index) => {
      const item = [...config.globalInstructions, ...config.localInstructions].find(
        (instruction) => instruction.scope === ref.scope && instruction.id === ref.id
      );
      if (!item) return undefined;
      return {
        id: `${item.scope}:instruction:${item.id}`,
        title: `${item.scope === 'global' ? 'Global' : 'Project'} instruction: ${item.label}`,
        content: item.content,
        priority: item.scope === 'global' ? 40 + index : 70 + index,
        kind: 'custom' as const,
        source: `${item.scope}:instruction:${item.id}`
      };
    })
    .filter(Boolean) as AgentInstructionSource[];
  const activeMode = config.activeModeRef
    ? [...config.globalModes, ...config.localModes].find(
        (mode) => mode.scope === config.activeModeRef?.scope && mode.id === config.activeModeRef.id
      )
    : undefined;

  const sources: AgentInstructionSource[] = [
    createBaseAgentInstructionSource(),
    ...getExternalInstructionSources(),
    ...activeInstructions,
    ...(activeMode
      ? [
          {
            id: `${activeMode.scope}:mode:${activeMode.id}`,
            title: `${activeMode.scope === 'global' ? 'Global' : 'Project'} mode: ${activeMode.label}`,
            content: activeMode.instructions,
            priority: activeMode.scope === 'global' ? 100 : 120,
            kind: 'mode' as const,
            source: `${activeMode.scope}:mode:${activeMode.id}`
          }
        ]
      : []),
    ...(skills.length
      ? [
          {
            id: 'skills',
            title: 'Custom skills',
            content: skills
              .map((skill) => `${skill.id}: ${skill.label} — ${skill.description || skill.command}`)
              .join('\n'),
            priority: 140,
            kind: 'skills' as const,
            source: 'skills'
          }
        ]
      : [])
  ];

  return sortAgentInstructionSources(sources);
}

/**
 * Собирает актуальный system prompt агента из языка, выбранных инструкций,
 * режима и skills. Prompt нельзя кешировать.
 */
export function buildAgentSystemPrompt(): string {
  return buildCoreAgentSystemPrompt({
    language: getAgentLanguage(),
    instructionSources: getAgentInstructionSources(),
    skills: getAgentSkills().map(({ id, label, description }) => ({ id, label, description }))
  });
}
