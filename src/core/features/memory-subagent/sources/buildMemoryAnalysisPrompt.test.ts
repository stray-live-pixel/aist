import { describe, expect, it } from 'vitest';

import { buildMemoryAnalysisPrompt } from './buildMemoryAnalysisPrompt';

/**
 * Что это: regression-тест на инструкции memory-субагента.
 * Зачем нужно: предложения памяти должны помогать будущим задачам проекта, а не фиксировать одноразовые детали текущего чата.
 */
describe('buildMemoryAnalysisPrompt', () => {
  it('просит обобщать конкретные наблюдения до будущих проектных правил', () => {
    const prompt = buildMemoryAnalysisPrompt({
      chatId: 'chat-1',
      chatModel: 'model',
      messages: [
        {
          id: 'message-1',
          role: 'user',
          content: 'Не показывай логотип приложения в иконке memory-субагента.',
          createdAt: 1
        }
      ],
      memoryItems: []
    });

    expect(prompt).toContain('Ищи не детали уже выполненной текущей задачи');
    expect(prompt).toContain('обобщи его до reusable правила проекта');
    expect(prompt).toContain(
      'Для любых фоновых операций в истории чата сначала переиспользуй стандартный чатовый loader'
    );
    expect(prompt).toContain('Иконка доменного помощника должна отражать роль помощника');
    expect(prompt).toContain('Не сохраняй факты о том, что уже было сделано в этом чате');
  });
});
