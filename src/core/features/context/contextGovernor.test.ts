import { describe, expect, it } from 'vitest';

import type { OpenRouterMessage } from '../../shared/types/types';
import { governModelContext } from './contextGovernor';

describe('governModelContext', () => {
  it('сохраняет полную историю и добавляет текущий prompt без памяти', () => {
    const history: OpenRouterMessage[] = [
      { role: 'user', content: 'старое требование, которое нельзя потерять' },
      { role: 'assistant', content: 'старый ответ, который должен остаться в истории' },
      { role: 'tool', tool_call_id: 'call-1', content: JSON.stringify({ ok: true, path: 'src/old.ts' }) },
      { role: 'user', content: 'последний уточняющий вопрос' },
      { role: 'assistant', content: 'последний ответ' }
    ];

    const result = governModelContext({
      prompt: 'Продолжи задачу с учетом всей истории.',
      history
    });

    expect(result.userContent).toBe('Продолжи задачу с учетом всей истории.');
    expect(result.messages).toEqual([...history, { role: 'user', content: 'Продолжи задачу с учетом всей истории.' }]);
  });

  it('добавляет релевантную память как synthetic tool-call после текущего prompt', () => {
    const history: OpenRouterMessage[] = [{ role: 'assistant', content: 'Предыдущий ответ.' }];

    const result = governModelContext({
      prompt: 'Проверь изменения.',
      history,
      memoryContextBlock: ['Relevant memory notes:', '- project: Проверять через npm run typecheck'].join('\n')
    });

    expect(result.messages).toHaveLength(4);
    expect(result.messages[0]).toEqual(history[0]);
    expect(result.messages[1]).toEqual({ role: 'user', content: 'Проверь изменения.' });
    expect(result.messages[2]).toMatchObject({
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: 'aist-memory-context',
          type: 'function',
          function: {
            name: 'get_relevant_memory'
          }
        }
      ]
    });
    expect(result.messages[3]).toMatchObject({
      role: 'tool',
      tool_call_id: 'aist-memory-context'
    });
    expect(result.messages[3]?.content).toContain('user-approved-memory');
    expect(result.messages[3]?.content).toContain('Проверять через npm run typecheck');
  });

  it('не добавляет synthetic memory tool-call для пустой памяти', () => {
    const result = governModelContext({
      prompt: 'Объясни код.',
      history: [],
      memoryContextBlock: '   '
    });

    expect(result.messages).toEqual([{ role: 'user', content: 'Объясни код.' }]);
  });
});
