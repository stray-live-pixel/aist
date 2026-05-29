import type { ServerResponse } from 'node:http';

/**
 * Что это: отправляет JSON-ответ из локального e2e mock server.
 * Зачем нужно: mock API модели должен отвечать как HTTP-сервис, чтобы daemon проходил реальный сетевой путь.
 */
export function sendJson({
  response,
  status,
  payload
}: {
  response: ServerResponse;
  status: number;
  payload: Record<string, unknown>;
}): void {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}
