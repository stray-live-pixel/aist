import http from 'node:http';

import { listenOnFreePort } from '../utils/listenOnFreePort';
import type { MockModelRequest } from './MockModelRequest';
import type { OpenRouterMock } from './OpenRouterMock';
import { handleOpenRouterMockRequest } from './handleOpenRouterMockRequest';

/**
 * Что это: запускает локальный OpenRouter-compatible mock server.
 * Зачем нужно: e2e поднимает реальный daemon, но все ИИ-запросы остаются внутри тестового процесса.
 */
export async function startOpenRouterMock(): Promise<OpenRouterMock> {
  const requests: MockModelRequest[] = [];
  const server = http.createServer((request, response) => {
    void handleOpenRouterMockRequest({ request, response, requests });
  });
  const port = await listenOnFreePort({ server });

  return {
    endpoint: `http://127.0.0.1:${port}/api/v1/chat/completions`,
    requests,
    server,
    reset: () => {
      requests.length = 0;
    }
  };
}
