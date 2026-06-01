import type { MockModelRequest } from '../../../sources/MockModelRequest';

/**
 * Что это: ищет synthetic tool-result памяти в основном запросе модели.
 * Зачем нужно: продуктовый контракт требует, чтобы результат memory-субагента был виден модели как tool-call/result.
 */
export function getMemoryToolPayload({ request }: { request: MockModelRequest | undefined }): string {
  const messages = Array.isArray(request?.body.messages)
    ? (request?.body.messages as Array<Record<string, unknown>>)
    : [];
  const memoryMessage = messages.find(
    (message) => message.role === 'tool' && String(message.content || '').includes('user-approved-memory')
  );

  return JSON.stringify(memoryMessage || {});
}
