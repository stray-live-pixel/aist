import type { IncomingMessage, ServerResponse } from 'node:http';

import { readJsonBody } from '../utils/readJsonBody';
import { sendJson } from '../utils/sendJson';
import type { MockModelRequest } from './MockModelRequest';
import { buildMockModelResponse } from './buildMockModelResponse';

/**
 * Что это: HTTP-handler локального OpenRouter mock server.
 * Зачем нужно: daemon делает настоящий HTTP POST, а e2e фиксирует request payload и отдаёт управляемый ответ модели.
 */
export async function handleOpenRouterMockRequest({
  request,
  response,
  requests
}: {
  request: IncomingMessage;
  response: ServerResponse;
  requests: MockModelRequest[];
}): Promise<void> {
  if (request.method !== 'POST') {
    sendJson({ response, status: 404, payload: { error: 'Only chat completions are mocked in e2e.' } });
    return;
  }

  const body = await readJsonBody({ request });
  requests.push({ method: request.method, url: request.url || '', body });

  sendJson({ response, status: 200, payload: buildMockModelResponse({ body }) });
}
