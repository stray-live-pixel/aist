import { type OpenRouterTool } from '../../../shared/types/types';

/**
 * Что это: схема инструмента запуска дочернего ИИ-агента.
 * Зачем нужно: основная модель может делегировать исследование или подготовку ответа отдельной модели.
 * Какую продуктовую проблему решает: пользовательский запрос выполняется быстрее за счёт параллельных независимых помощников.
 */
export const spawnAgentTool: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'spawn_agent',
    description:
      'Spawn an additional AI agent for a focused subtask. Use it to research the project, inspect code, summarize an area, or prepare an independent answer while the main agent continues working. Set mode="wait" when you need the result before continuing, or mode="background" when the agent may finish later.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Focused task for the spawned agent. Include exact files, questions, and expected output.'
        },
        system: {
          type: 'string',
          description: 'Optional system instruction for the spawned agent.'
        },
        title: {
          type: 'string',
          description: 'Short human-readable title for this spawned agent run.'
        },
        mode: {
          type: 'string',
          enum: ['wait', 'background'],
          description:
            'wait returns the spawned agent result in this tool call; background starts it and returns run metadata immediately.'
        },
        model: {
          type: 'string',
          description: 'Optional model override. Empty uses the configured auxiliary tool model.'
        },
        reasoningEffort: {
          type: 'string',
          enum: ['auto', 'low', 'medium', 'high'],
          description: 'Optional reasoning effort override for this spawned agent.'
        },
        allowTools: {
          type: 'boolean',
          description:
            'Whether the spawned agent may use tools allowed for auxiliary agents. Defaults to the auxiliary tool settings.'
        },
        reason: {
          type: 'string',
          description: 'Short reason why the extra agent is needed now.'
        },
        nextStep: {
          type: 'string',
          description: 'What the main agent will do after spawning this agent.'
        }
      },
      required: ['prompt']
    }
  }
};
