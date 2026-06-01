import type { MockModelRequest } from '../../../sources/MockModelRequest';

/**
 * Что это: находит HTTP-запросы AI memory-субагента в истории OpenRouter mock.
 * Зачем нужно: e2e должен доказать, что запускался именно субагент памяти, а не только основной ответ чата.
 */
export function findMemorySubagentRequests(input: { requests: MockModelRequest[] }): MockModelRequest[] {
  return input.requests.filter((request) =>
    JSON.stringify(request.body.messages || []).includes('Ты субагент памяти AIST')
  );
}
