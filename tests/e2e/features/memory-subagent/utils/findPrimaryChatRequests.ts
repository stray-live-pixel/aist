import type { MockModelRequest } from '../../../sources/MockModelRequest';

/**
 * Что это: отделяет запросы основной модели чата от запросов memory-субагента.
 * Зачем нужно: тесты проверяют fallback на модель чата и наличие memory tool-result в основном model payload.
 */
export function findPrimaryChatRequests(input: { requests: MockModelRequest[] }): MockModelRequest[] {
  return input.requests.filter(
    (request) => !JSON.stringify(request.body.messages || []).includes('Ты субагент памяти AIST')
  );
}
