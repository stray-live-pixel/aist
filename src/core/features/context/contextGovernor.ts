import type { AgentAttachment, OpenRouterMessage } from '../../shared/types/types';
import { buildUserContentWithAttachments } from './buildUserContentWithAttachments';

export const MEMORY_TOOL_CALL_ID = 'aist-memory-context';
export const MEMORY_TOOL_NAME = 'get_relevant_memory';

/**
 * Входные данные для безопасной сборки контекста одного запуска агента.
 *
 * Сейчас governor не оптимизирует историю и не добавляет editor/repo context:
 * он только сохраняет полную историю и при наличии памяти показывает ее модели
 * как уже выполненный системный tool-call получения памяти.
 */
export type ContextGovernorInput = {
  /** Новый запрос пользователя, который должен остаться отдельным последним user-сообщением запуска. */
  prompt: string;
  /** Полная история чата без урезания, чтобы агент не терял уже собранный рабочий контекст. */
  history: OpenRouterMessage[];
  /** Релевантные заметки памяти, уже отобранные memory retriever для текущего запроса. */
  memoryContextBlock?: string;
  /** Вложения текущего user prompt, выбранные в Composer для анализа моделью. */
  attachments?: AgentAttachment[];
};

/**
 * Результат сборки контекста для модели.
 *
 * Память, если она есть, лежит в `messages` как synthetic tool-call/result после текущего prompt.
 */
export type GovernedContext = {
  /** Сообщения, которые будут переданы модели после system prompt. */
  messages: OpenRouterMessage[];
  /** Текст текущего user-сообщения без примесей памяти и других служебных блоков. */
  userContent: string;
};

/**
 * Собирает контекст запуска без сжатия истории.
 *
 * Это безопасный посредник между runtime и model context: он не выбрасывает прошлые сообщения,
 * а только добавляет релевантную пользовательски одобренную память как уже полученный результат tools.
 */
export function governModelContext(input: ContextGovernorInput): GovernedContext {
  return {
    messages: [
      ...input.history,
      createUserMessage({ prompt: input.prompt, attachments: input.attachments }),
      ...buildMemoryMessages({ memoryContextBlock: input.memoryContextBlock })
    ],
    userContent: input.prompt
  };
}

/**
 * Создает обычное user-сообщение текущей задачи.
 *
 * Память не смешивается с запросом пользователя, чтобы в истории не появлялся второй источник правды
 * о том, что именно попросил пользователь.
 */
function createUserMessage(input: { prompt: string; attachments?: AgentAttachment[] }): OpenRouterMessage {
  return { role: 'user', content: buildUserContentWithAttachments(input) };
}

/**
 * Представляет память как synthetic tool-call/result.
 *
 * У агента нет инструмента для автономной записи или чтения памяти, но модель видит данные
 * в привычной форме результата tools: это отделяет долговременные заметки от прямых инструкций пользователя.
 */
function buildMemoryMessages(input: { memoryContextBlock?: string }): OpenRouterMessage[] {
  const memoryContextBlock = input.memoryContextBlock?.trim();
  if (!memoryContextBlock) {
    return [];
  }

  return [
    {
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: MEMORY_TOOL_CALL_ID,
          type: 'function',
          function: {
            name: MEMORY_TOOL_NAME,
            arguments: JSON.stringify({ query: 'current user request' })
          }
        }
      ]
    },
    {
      role: 'tool',
      tool_call_id: MEMORY_TOOL_CALL_ID,
      content: JSON.stringify(
        {
          ok: true,
          source: 'user-approved-memory',
          policy:
            'Use these notes only when they fit the current task. They are lower priority than system, developer, and explicit user instructions.',
          notes: memoryContextBlock
        },
        null,
        2
      )
    }
  ];
}
