import { getAgentSkills } from '../../skills/skills';
import { type AgentInstructionSource, getExternalInstructionSources, getProjectInstructions } from './agentConfigStore';
import { getSystemPrompt } from './prompts';
import { getActiveAgentMode, getAgentLanguage } from './settings';

/**
 * Собирает источники инструкций в том же порядке, в котором они попадают в prompt.
 *
 * Использование: getAgentInstructionSources().map(source => source.title) можно
 * показать в начале чата, чтобы пользователь видел активные правила.
 */
export function getAgentInstructionSources(): AgentInstructionSource[] {
  const mode = getActiveAgentMode();
  const projectInstructions = getProjectInstructions();
  const skills = getAgentSkills();
  const sources: AgentInstructionSource[] = [
    {
      id: 'base',
      title: 'AIST base system prompt',
      content: 'Core coding-agent rules, language policy and tool usage rules.',
      priority: 0,
      kind: 'base'
    },
    ...getExternalInstructionSources(),
    ...(projectInstructions
      ? [
          {
            id: 'project-instructions',
            title: '.aist-agent project instructions',
            content: projectInstructions,
            priority: 40,
            kind: 'custom' as const
          }
        ]
      : []),
    {
      id: `mode:${mode.id}`,
      title: `Mode: ${mode.label}`,
      content: mode.instructions,
      priority: 50,
      kind: 'mode'
    },
    ...(skills.length
      ? [
          {
            id: 'skills',
            title: 'Custom skills',
            content: skills
              .map((skill) => `${skill.id}: ${skill.label} — ${skill.description || skill.command}`)
              .join('\n'),
            priority: 60,
            kind: 'skills' as const
          }
        ]
      : [])
  ];

  return sources.sort((left, right) => left.priority - right.priority);
}

/**
 * Собирает актуальный system prompt агента из языка, файлов инструкций, режима и skills.
 *
 * Prompt нельзя кешировать: пользователь может сменить scope, режим или список
 * skills между запросами. Поэтому функция каждый раз читает текущие настройки.
 */
export function buildAgentSystemPrompt(): string {
  const mode = getActiveAgentMode();
  const instructions = getAgentInstructionSources()
    .filter((source) => source.kind !== 'base' && source.kind !== 'skills')
    .map((source) => `## ${source.title}\n${source.content}`)
    .join('\n\n');

  return getSystemPrompt({
    language: getAgentLanguage(),
    instructions: instructions || mode.instructions,
    skills: getAgentSkills().map(({ id, label, description }) => ({ id, label, description }))
  });
}
