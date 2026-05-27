import type { OpenRouterTool } from '../../openrouter/types';
import type { AgentSkill } from '../../skills/skills';
import { runSkillTool } from '../../skills/skills';
import { filesystemTools } from '../../tools/filesystemTools';
import { planningTools } from '../../tools/planningTools';
import { getAgentToolRegistry } from './toolRegistry';

/**
 * Формирует список tools для модели с учетом пользовательских skills.
 *
 * run_skill добавляется только когда есть хотя бы один skill: так модель не
 * получает бесполезный инструмент и не пытается вызвать несуществующие команды.
 */
export function getAgentTools(skills: AgentSkill[]): OpenRouterTool[] {
  const builtInTools = [...filesystemTools, ...planningTools];
  const tools = skills.length ? [...builtInTools, runSkillTool] : builtInTools;
  const usedNames = new Set(tools.map((tool) => tool.function.name));
  const projectTools = getAgentToolRegistry()
    .snapshot()
    .tools.filter((tool) => !usedNames.has(tool.function.name));

  return [...tools, ...projectTools];
}
