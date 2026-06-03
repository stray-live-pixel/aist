import type { OpenRouterTool } from '../../../shared/types/types';

const TOOL_NOTE_FIELDS = new Set(['reason', 'nextStep']);

/**
 * Что это: возвращает копии tool schema, где служебные поля reason/nextStep больше не обязательны.
 * Зачем нужно: быстрый режим оставляет инструменты совместимыми, но не заставляет модель тратить токены на пояснения каждого вызова.
 * Какую продуктовую проблему решает: пользователь получает более быстрые ответы и меньше расход контекста без потери самих инструментов.
 */
export function withoutRequiredToolCallNotes({ tools }: { tools: OpenRouterTool[] }): OpenRouterTool[] {
  return tools.map((tool) => {
    const required = tool.function.parameters.required;
    if (!Array.isArray(required)) {
      return tool;
    }

    // Меняем только верхнеуровневый required: свойства остаются описанными, чтобы старые модели могли их передавать добровольно.
    const nextRequired = required.filter((field) => typeof field !== 'string' || !TOOL_NOTE_FIELDS.has(field));
    if (nextRequired.length === required.length) {
      return tool;
    }

    return {
      ...tool,
      function: {
        ...tool.function,
        parameters: {
          ...tool.function.parameters,
          required: nextRequired
        }
      }
    };
  });
}
