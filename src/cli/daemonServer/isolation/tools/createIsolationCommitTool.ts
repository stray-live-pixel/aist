import type { OpenRouterTool } from '../../../../core/shared/types/types';

/**
 * Что это: schema isolated-only инструмента для фиксации завершённой подзадачи.
 * Зачем нужно: агент может сам ставить git-checkpoint после каждого атомарного шага большой задачи.
 * Какую продуктовую проблему решает: ревьюер видит, какое изменение относится к какой подзадаче, а не один огромный commit.
 */
export function createIsolationCommitTool(): OpenRouterTool {
  return {
    type: 'function',
    function: {
      name: 'create_isolation_commit',
      description:
        'Create a git commit for one completed isolated subtask. Use only after implementing and checking a small finished subtask so every decomposed task has a separate reviewable commit.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Short product-readable title of the completed subtask.'
          },
          summary: {
            type: 'string',
            description: 'What changed in this subtask and why it is complete.'
          }
        },
        required: ['title', 'summary']
      }
    }
  };
}
