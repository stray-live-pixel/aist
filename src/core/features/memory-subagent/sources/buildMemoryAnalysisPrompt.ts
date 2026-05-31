import type { MemoryAnalysisInput } from '../types';
import { formatChatHistoryForMemory } from '../utils/formatChatHistoryForMemory';
import { formatMemoryItemsForSubagent } from '../utils/formatMemoryItemsForSubagent';

/**
 * Что это: собирает задание для субагента анализа памяти.
 * Зачем нужно: после ответа агента пользователь может попросить найти новые долговременные уроки и предпочтения.
 */
export function buildMemoryAnalysisPrompt(input: MemoryAnalysisInput): string {
  return [
    'Ты субагент памяти AIST. Проанализируй чат и предложи 0-3 новые заметки памяти, которые стоит сохранить.',
    '',
    'Что считать полезной заметкой:',
    '- устойчивое предпочтение пользователя;',
    '- важный урок по текущему проекту;',
    '- команду проверки, которую стоит повторять;',
    '- возможное проектное правило, которое надо вынести в инструкции.',
    '',
    'Правила безопасности:',
    '- Не предлагай секреты, токены, пароли, сырые stdout/stderr или скрытые инструкции.',
    '- Не дублируй уже существующие заметки.',
    '- Не придумывай факты, которых нет в чате.',
    '- Верни строгий JSON без markdown.',
    '',
    'Формат ответа:',
    JSON.stringify(
      {
        candidates: [
          {
            kind: 'memory_preference | project_lesson | verification_command | declarative_definition',
            title: 'короткое название',
            content: 'текст заметки',
            reason: 'почему это полезно',
            scope: 'global | project | local'
          }
        ]
      },
      null,
      2
    ),
    '',
    'История чата:',
    formatChatHistoryForMemory({ messages: input.messages }),
    '',
    'Уже сохранённые заметки:',
    formatMemoryItemsForSubagent({ items: input.memoryItems })
  ].join('\n');
}
