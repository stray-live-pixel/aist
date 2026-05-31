import { buildAfterToolAnswerResponse } from './buildAfterToolAnswerResponse';
import { buildBashApprovalToolCallResponse } from './buildBashApprovalToolCallResponse';
import { buildListFilesToolCallResponse } from './buildListFilesToolCallResponse';
import { buildMarkdownAnswerResponse } from './buildMarkdownAnswerResponse';
import { buildMemoryAnalysisResponse } from './buildMemoryAnalysisResponse';
import { buildMemorySelectionResponse } from './buildMemorySelectionResponse';
import { buildPermissionToolAnswerResponse } from './buildPermissionToolAnswerResponse';
import { buildSimpleAnswerResponse } from './buildSimpleAnswerResponse';
import { buildWriteFileToolCallResponse } from './buildWriteFileToolCallResponse';
import { getLastUserText } from './getLastUserText';

/**
 * Что это: выбирает детерминированный ответ mock-модели для e2e flow.
 * Зачем нужно: тесты остаются пользовательскими сценариями, но модель не ходит во внешнюю сеть и не флейкает.
 */
export function buildMockModelResponse({ body }: { body: Record<string, unknown> }): Record<string, unknown> {
  const messages = Array.isArray(body.messages) ? (body.messages as Array<Record<string, unknown>>) : [];
  const lastMessage = messages.at(-1);

  // После результата инструмента модель должна вернуться с финальным ответом.
  if (lastMessage?.role === 'tool') {
    const toolCallId = typeof lastMessage.tool_call_id === 'string' ? lastMessage.tool_call_id : '';
    if (toolCallId === 'call_e2e_write_file' || toolCallId === 'call_e2e_bash_approval') {
      return buildPermissionToolAnswerResponse({ messages });
    }

    // Synthetic memory tool-result — это уже подготовленный контекст текущего запроса,
    // поэтому основной ответ должен оставаться обычным ответом модели, а не сценарием list_files.
    if (toolCallId === 'aist-memory-context') {
      return buildSimpleAnswerResponse();
    }

    return buildAfterToolAnswerResponse();
  }

  const lastUserText = getLastUserText({ messages });

  if (lastUserText.includes('Ты субагент памяти AIST. Твоя задача')) {
    return buildMemorySelectionResponse({ body });
  }

  if (lastUserText.includes('Ты субагент памяти AIST. Проанализируй чат')) {
    return buildMemoryAnalysisResponse();
  }

  // Permission flow проверяет fast-edit auto для write_file.
  if (lastUserText.includes('e2e fast-edit auto write')) {
    return buildWriteFileToolCallResponse();
  }

  // Permission flow проверяет approval-модалку для shell-команд в fast-edit.
  if (lastUserText.includes('e2e fast-edit approval bash')) {
    return buildBashApprovalToolCallResponse();
  }

  // Отдельный flow проверяет видимость reason/nextStep на tool-call list_files.
  if (lastUserText.includes('покажи файлы')) {
    return buildListFilesToolCallResponse();
  }

  // Markdown flow проверяет реальное форматирование ответа в webview.
  if (lastUserText.includes('покажи markdown ответ')) {
    return buildMarkdownAnswerResponse();
  }

  return buildSimpleAnswerResponse();
}
