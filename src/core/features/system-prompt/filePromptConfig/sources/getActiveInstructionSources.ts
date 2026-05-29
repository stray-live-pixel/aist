import type { AgentInstructionSource } from '../../systemPrompt';
import type { FilePromptConfig } from '../types';

/**
 * Что это: превращает выбранные пользователем инструкции в секции system prompt.
 * Зачем нужно: active preset хранит только refs, а модели нужен фактический текст инструкций.
 */
export function getActiveInstructionSources(params: { config: FilePromptConfig }): AgentInstructionSource[] {
  const allInstructions = [...params.config.globalInstructions, ...params.config.localInstructions];

  return params.config.activeInstructionRefs
    .map((ref, index) => {
      const item = allInstructions.find((instruction) => instruction.scope === ref.scope && instruction.id === ref.id);
      if (!item) return undefined;

      const source: AgentInstructionSource = {
        id: `${item.scope}:instruction:${item.id}`,
        title: `${item.scope === 'global' ? 'Global' : 'Project'} instruction: ${item.label}`,
        content: item.content,
        priority: item.scope === 'global' ? 40 + index : 70 + index,
        kind: 'custom',
        source: `${item.scope}:instruction:${item.id}`
      };

      return source;
    })
    .filter((source): source is AgentInstructionSource => Boolean(source));
}
