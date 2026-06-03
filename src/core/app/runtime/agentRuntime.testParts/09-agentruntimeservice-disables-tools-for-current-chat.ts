import { describe, expect, it, vi } from 'vitest';

import type { ModelClient } from '../../../entities/model/modelTransport';
import type { OpenRouterMessage } from '../../../shared/types/types';
import { createHarness, createToolCall } from './helpers';

/**
 * Что это: regression-тест chat-scoped режима ответа без инструментов.
 * Зачем нужно: кнопка Composer должна отключать tools только в текущем чате и не запускать tool-runner.
 * Какую продуктовую проблему решает: быстрый вопрос получает прямой ответ модели без лишних итераций и без влияния на другие диалоги.
 */
describe('AgentRuntimeService toolsDisabled mode', () => {
  it('отправляет текущий чат в модель без tools и не выполняет запрошенный tool-call', async () => {
    const modelClient = createModelClientSpy([
      {
        role: 'assistant',
        content: '',
        tool_calls: [createToolCall('run_bash_script', { script: 'echo should-not-run' })]
      }
    ]);
    const harness = createHarness({ modelClient });
    harness.chat.modelSettings.toolsDisabled = true;

    const result = await harness.runtime.ask('chat-1', 'Ответь без инструментов');

    expect(result).toEqual({ accepted: true, runId: 'run-1' });
    expect(modelClient.chat).toHaveBeenCalledTimes(1);
    expect(modelClient.chat).toHaveBeenCalledWith(
      expect.any(Array),
      undefined,
      'test-model',
      expect.any(AbortSignal),
      undefined,
      expect.anything(),
      expect.any(Object)
    );
    expect(harness.filesystemExecute).not.toHaveBeenCalled();
    expect(harness.chat.messages.filter((message) => message.role === 'tool')).toHaveLength(0);
    expect(harness.chat.lastAnswer).toContain('tools are disabled for this chat');
  });
});

/**
 * Что это: test-double модели, который сохраняет аргументы chat-вызова.
 * Зачем нужно: regression-тест проверяет отсутствие tool schemas в реальном model request.
 * Какую продуктовую проблему решает: режим без инструментов нельзя случайно превратить в обычный агентский запуск.
 */
function createModelClientSpy(responses: OpenRouterMessage[]): ModelClient {
  const queue = [...responses];
  return {
    chat: vi.fn(async () => {
      const next = queue.shift();
      if (!next) {
        throw new Error('Unexpected model request.');
      }
      return next;
    })
  };
}
