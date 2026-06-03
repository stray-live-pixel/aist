import { describe, expect, it } from 'vitest';

import type { OpenRouterTool } from '../../../shared/types/types';
import { withoutRequiredToolCallNotes } from './withoutRequiredToolCallNotes';

/**
 * Что это: regression-тест schema быстрого режима tools.
 * Зачем нужно: reason/nextStep должны оставаться доступными, но перестать быть обязательными только в fast-режиме.
 * Какую продуктовую проблему решает: кнопка «Турбо tools» реально экономит токены и не ломает обычный режим агента.
 */
describe('withoutRequiredToolCallNotes', () => {
  it('делает reason и nextStep необязательными без мутации исходной schema', () => {
    const tool: OpenRouterTool = {
      type: 'function',
      function: {
        name: 'write_file',
        description: 'Create a file.',
        parameters: {
          type: 'object',
          properties: {
            reason: { type: 'string' },
            nextStep: { type: 'string' },
            path: { type: 'string' },
            content: { type: 'string' }
          },
          required: ['reason', 'nextStep', 'path', 'content'],
          additionalProperties: false
        }
      }
    };

    const [fastTool] = withoutRequiredToolCallNotes({ tools: [tool] });

    expect(fastTool.function.parameters.required).toEqual(['path', 'content']);
    expect((fastTool.function.parameters.properties as Record<string, unknown>).reason).toEqual({ type: 'string' });
    expect(tool.function.parameters.required).toEqual(['reason', 'nextStep', 'path', 'content']);
  });
});
