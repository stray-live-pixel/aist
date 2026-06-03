import { MEMORY_TOTAL_NOTE_CHARS_LIMIT, getMemoryTotalNoteChars } from '../../../entities/memory/memory';
import type { MemoryWriteDecisionInput } from '../types';
import { formatMemoryItemsForSubagent } from '../utils/formatMemoryItemsForSubagent';

/**
 * Что это: собирает prompt для решения о записи одной заметки памяти.
 * Зачем нужно: AI-субагент видит все заметки, новую заметку и лимит 50000 символов перед записью.
 * Какую продуктовую проблему решает: память добавляет только действительно полезные наблюдения или заменяет менее важные.
 */
export function buildMemoryWriteDecisionPrompt(input: MemoryWriteDecisionInput): string {
  const totalChars = getMemoryTotalNoteChars({ items: input.memoryItems });

  return [
    'Ты субагент записи памяти AIST. Оцени одну новую заметку и реши, нужно ли сохранить её.',
    '',
    'Цель памяти:',
    '- хранить быстрые минималистичные правила, предпочтения и проектные уроки для будущих задач;',
    '- не хранить одноразовые факты, пересказ выполненной задачи, сырые логи, секреты или дубли;',
    '- каждая заметка должна быть короткой, самодостаточной и reusable.',
    '',
    'Лимит памяти:',
    `- суммарная длина всех заметок не должна превышать ${MEMORY_TOTAL_NOTE_CHARS_LIMIT} символов;`,
    `- сейчас сохранено символов: ${totalChars};`,
    '- если новая заметка полезна, но лимит будет превышен, выбери replace и укажи id одной менее полезной заметки;',
    '- заменять можно только заметку того же scope, что и новая заметка;',
    '- если подходящей замены нет, верни reject.',
    '',
    'Вес полезности:',
    '- importance — целое число 1..100;',
    '- 90-100: критичное устойчивое правило или сильное предпочтение пользователя;',
    '- 60-89: полезный проектный паттерн или частая команда проверки;',
    '- 30-59: умеренно полезное правило, которое может пригодиться;',
    '- 1-29: слабая польза; обычно лучше reject.',
    '',
    'Верни строгий JSON без markdown:',
    JSON.stringify(
      {
        action: 'add | replace | reject',
        scope: 'global | project',
        note: 'итоговый текст заметки, если add/replace',
        importance: 75,
        replaceItemId: 'id заменяемой заметки только для replace',
        reason: 'короткое объяснение решения'
      },
      null,
      2
    ),
    '',
    'Новая заметка:',
    `scope=${input.candidate.scope}; note=${input.candidate.note}; suggestedImportance=${input.candidate.importance ?? 'не задан'}`,
    '',
    'Все сохранённые заметки:',
    formatMemoryItemsForSubagent({ items: input.memoryItems })
  ].join('\n');
}
