import { buildChatResponse } from './buildChatResponse';

/**
 * Что это: финальный mock-ответ после permission tool-call.
 * Зачем нужно: e2e проверяет, что agent loop вернулся к модели после auto/approval tool result.
 */
export function buildPermissionToolAnswerResponse({
  messages
}: {
  messages: Array<Record<string, unknown>>;
}): Record<string, unknown> {
  const lastToolMessage = messages.at(-1);
  const toolCallId = typeof lastToolMessage?.tool_call_id === 'string' ? lastToolMessage.tool_call_id : '';
  const toolName = toolCallId === 'call_e2e_bash_approval' ? 'run_bash_script' : 'write_file';
  const toolContent = typeof lastToolMessage?.content === 'string' ? lastToolMessage.content : '';
  const hasComment = toolContent.includes('E2E комментарий: команду можно выполнить один раз.');

  return buildChatResponse({
    message: {
      role: 'assistant',
      content: hasComment
        ? 'Модель получила комментарий пользователя из approval и продолжила работу после run_bash_script.'
        : `Инструмент ${toolName} выполнен автоматически по выбранному permission preset.`
    }
  });
}
