import type { MockModelRequest } from './MockModelRequest';

/**
 * Что это: достаёт system prompt из OpenRouter-compatible mock request.
 * Зачем нужно: e2e должен доказать не только сохранение инструкции в UI, но и её фактическую отправку модели.
 * Какую продуктовую проблему решает: если активная инструкция есть в настройках, но не попадает в model request, агент будет игнорировать правила пользователя.
 */
export function getSystemPromptFromMockRequest({ request }: { request: MockModelRequest | undefined }): string {
  const messages = Array.isArray(request?.body.messages) ? request.body.messages : [];
  const systemMessage = messages.find(
    (message): message is { role: string; content: string } =>
      Boolean(message) &&
      typeof message === 'object' &&
      (message as { role?: unknown }).role === 'system' &&
      typeof (message as { content?: unknown }).content === 'string'
  );

  return systemMessage?.content || '';
}
