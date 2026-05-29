import type { AgentInstructionSource, AgentSystemPromptSkill } from '../../systemPrompt';

/**
 * Что это: создаёт диагностический источник для пользовательских skills.
 * Зачем нужно: preview и отладка prompt показывают, какие skills были доступны при запросе модели.
 */
export function getSkillInstructionSource(params: {
  skills: AgentSystemPromptSkill[];
}): AgentInstructionSource | undefined {
  if (!params.skills.length) return undefined;

  return {
    id: 'skills',
    title: 'Custom skills',
    content: params.skills.map((skill) => `${skill.id}: ${skill.label} — ${skill.description || ''}`).join('\n'),
    priority: 140,
    kind: 'skills',
    source: 'skills'
  };
}
