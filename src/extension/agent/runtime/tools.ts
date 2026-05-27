import type { OpenRouterTool } from '../../openrouter/types';
import type { AgentSkill } from '../../skills/skills';
import { runSkillTool } from '../../skills/skills';
import { filesystemTools } from '../../tools/filesystemTools';
import { planningTools } from '../../tools/planningTools';

/**
 * Формирует список tools для модели с учетом пользовательских skills.
 *
 * run_skill добавляется только когда есть хотя бы один skill: так модель не
 * получает бесполезный инструмент и не пытается вызвать несуществующие команды.
 */
export function getAgentTools(skills: AgentSkill[]): OpenRouterTool[] {
  const baseTools = [...filesystemTools, ...planningTools];
  return skills.length ? [...baseTools, runSkillTool] : baseTools;
}
