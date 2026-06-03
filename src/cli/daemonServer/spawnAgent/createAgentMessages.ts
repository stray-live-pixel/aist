import type { ToolRunnerSpawnAgentInput } from '../../../core/features/tool-execution/toolRunner';
import type { OpenRouterMessage } from '../../../core/shared/types/types';

/**
 * Что это: собирает prompt дочернего агента.
 * Зачем нужно: субагент получает понятные ограничения и не спорит с главным агентом за право финального ответа.
 * Какую продуктовую проблему решает: делегирование остаётся сфокусированным и безопасным для основного пользовательского сценария.
 */
export function createAgentMessages({
  input,
  model
}: {
  input: ToolRunnerSpawnAgentInput;
  model: string;
}): OpenRouterMessage[] {
  return [
    {
      role: 'system',
      content:
        input.system ||
        'Ты дочерний ИИ-агент AIST. Выполни только порученную подзадачу, верни краткий проверяемый отчёт с фактами, файлами и выводами. Не делай финальный пользовательский ответ за главного агента.'
    },
    {
      role: 'user',
      content: `Модель: ${model}\n\nЗадача дочернего агента:\n${input.prompt}`
    }
  ];
}
