import { describe, expect, it } from 'vitest';

import { parseMemoryWriteDecisionResponse } from './parseMemoryWriteDecisionResponse';

const baseInput = {
  candidate: { scope: 'project' as const, note: 'Always run focused tests for memory changes.', importance: 80 },
  memoryItems: [
    {
      id: 'weak',
      scope: 'project' as const,
      note: 'Weak note.',
      enabled: true,
      importance: 10,
      createdAt: 1,
      updatedAt: 1
    }
  ],
  chatModel: 'model'
};

/**
 * Что это: regression-тесты AI-решения о записи памяти.
 * Зачем нужно: автоматическая память должна соблюдать add/reject/replace и лимит 50000 символов.
 * Какую продуктовую проблему решает: модель не может записать невалидную или слишком большую память.
 */
describe('parseMemoryWriteDecisionResponse', () => {
  it('accepts add decision with normalized importance', () => {
    const decision = parseMemoryWriteDecisionResponse({
      decisionInput: baseInput,
      response: {
        role: 'assistant',
        content: JSON.stringify({ action: 'add', scope: 'project', note: 'Use focused memory tests.', importance: 88 })
      }
    });

    expect(decision).toEqual({ action: 'add', scope: 'project', note: 'Use focused memory tests.', importance: 88 });
  });

  it('accepts replace only when replacement item exists in the same scope', () => {
    const decision = parseMemoryWriteDecisionResponse({
      decisionInput: baseInput,
      response: {
        role: 'assistant',
        content: JSON.stringify({
          action: 'replace',
          scope: 'project',
          note: 'Prefer compact reusable memory notes.',
          importance: 95,
          replaceItemId: 'weak'
        })
      }
    });

    expect(decision).toMatchObject({ action: 'replace', replaceItemId: 'weak', importance: 95 });
  });

  it('rejects add when the memory limit would be exceeded', () => {
    const almostFull = {
      ...baseInput,
      memoryItems: [
        {
          ...baseInput.memoryItems[0],
          note: 'x'.repeat(49_990)
        }
      ]
    };

    const decision = parseMemoryWriteDecisionResponse({
      decisionInput: almostFull,
      response: {
        role: 'assistant',
        content: JSON.stringify({ action: 'add', scope: 'project', note: 'Too long new note.', importance: 90 })
      }
    });

    expect(decision.action).toBe('reject');
  });
});
