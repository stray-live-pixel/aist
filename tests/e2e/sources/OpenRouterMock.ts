import type http from 'node:http';

import type { MockModelRequest } from './MockModelRequest';

/**
 * Что это: управляемый локальный mock OpenRouter Chat Completions API.
 * Зачем нужно: Playwright поднимает реальный VS Code, а ответы модели остаются детерминированными и быстрыми.
 */
export type OpenRouterMock = {
  endpoint: string;
  requests: MockModelRequest[];
  server: http.Server;
  reset(): void;
};
