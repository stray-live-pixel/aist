import { buildChatResponse } from './buildChatResponse';

/**
 * Что это: mock-ответ модели, который просит daemon вызвать shell-команду.
 * Зачем нужно: e2e проверяет, что fast-edit спрашивает подтверждение там, где preset требует ask.
 */
export function buildBashApprovalToolCallResponse(): Record<string, unknown> {
  return buildChatResponse({
    message: {
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: 'call_e2e_bash_approval',
          type: 'function',
          function: {
            name: 'run_bash_script',
            arguments: JSON.stringify({
              reason: 'Нужно выполнить shell-команду, а fast-edit должен запросить явное подтверждение пользователя.',
              nextStep: 'После решения пользователя я продолжу с учетом его комментария.',
              script: 'printf "approval-ok"'
            })
          }
        }
      ]
    }
  });
}
