import { getAgentSkills } from '../../skills/skills';
import { getSystemPrompt } from './prompts';
import { getActiveAgentMode, getAgentLanguage } from './settings';

/**
 * Собирает актуальный system prompt агента из языка, режима и skills.
 *
 * Prompt нельзя кешировать: пользователь может сменить язык, режим или список
 * skills между запросами. Поэтому функция каждый раз читает текущие настройки.
 */
export function buildAgentSystemPrompt(): string {
  const mode = getActiveAgentMode();
  return getSystemPrompt({
    language: getAgentLanguage(),
    instructions: mode.instructions,
    skills: getAgentSkills().map(({ id, label, description }) => ({ id, label, description }))
  });
}
