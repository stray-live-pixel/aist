import type { FastifyReply, FastifyRequest } from 'fastify';

import type { CreateServerDeps } from '../../../createServer';
import { writeSse } from '../../../utils/http/writeSse';

export function handleEventsRoute({
  request,
  reply,
  deps
}: {
  readonly request: FastifyRequest;
  readonly reply: FastifyReply;
  readonly deps: Pick<CreateServerDeps, 'eventClients'>;
}): void {
  reply.hijack();
  reply.raw.writeHead(200, {
    'cache-control': 'no-cache',
    connection: 'keep-alive',
    'content-type': 'text/event-stream'
  });
  deps.eventClients.add(reply.raw);
  writeSse({ response: reply.raw, message: { type: 'connected', at: Date.now() } });
  request.raw.on('close', () => deps.eventClients.delete(reply.raw));
}
