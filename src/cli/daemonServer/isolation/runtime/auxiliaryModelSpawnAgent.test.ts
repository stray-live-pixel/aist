import { describe, expect, it, vi } from 'vitest';

import { auxiliaryModelSpawnAgent } from './auxiliaryModelSpawnAgent';

/**
 * Что это: regression-тест isolated spawn_agent adapter.
 * Зачем нужно: parallel-safe research должен работать в Docker run без обычного daemon subagent lifecycle.
 * Какую продуктовую проблему решает: сложная задача может декомпозироваться и исследоваться параллельно перед отдельными commit-шагами.
 */
describe('auxiliaryModelSpawnAgent', () => {
  it('returns waited auxiliary model result for isolated parallel research', async () => {
    const invoke = vi.fn(async () => ({ role: 'assistant' as const, content: 'Parallel research summary' }));

    const result = await auxiliaryModelSpawnAgent({
      auxiliaryModel: { invoke },
      input: {
        parentChatId: 'chat-1',
        prompt: 'Research independent API area',
        system: 'Return a concise implementation summary.',
        title: 'API research',
        mode: 'wait'
      }
    });

    expect(invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'system', content: 'Return a concise implementation summary.' },
          { role: 'user', content: 'Research independent API area' }
        ]
      })
    );
    expect(result).toMatchObject({
      ok: true,
      mode: 'wait',
      title: 'API research',
      status: 'success',
      content: 'Parallel research summary'
    });
  });
});
