/**
 * Что это: достаёт последний текст пользователя из OpenRouter messages.
 * Зачем нужно: mock-модель выбирает сценарий ответа по пользовательскому prompt, как это сделал бы настоящий агентный backend.
 */
export function getLastUserText({ messages }: { messages: Array<Record<string, unknown>> }): string {
  return String([...messages].reverse().find((message) => message.role === 'user')?.content || '');
}
