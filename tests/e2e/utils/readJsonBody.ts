import type { IncomingMessage } from 'node:http';

/**
 * Что это: читает JSON body из HTTP-запроса локального mock server.
 * Зачем нужно: e2e может проверять, какие messages и tools daemon реально отправил модели.
 */
export async function readJsonBody({ request }: { request: IncomingMessage }): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const text = Buffer.concat(chunks).toString('utf8');
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}
