import type { FastifyInstance } from 'fastify';

import type { CreateServerDeps } from './createServer';
import { handleEventsRoute } from './routes/api/events/handleEventsRoute';
import { handleRpcRoute } from './routes/api/rpc/handleRpcRoute';
import { handleStaticRoute } from './routes/static/handleStaticRoute';

export function registerRoutes({
  server,
  deps
}: {
  readonly server: FastifyInstance;
  readonly deps: CreateServerDeps;
}): void {
  server.post('/api/rpc', (request, reply) => handleRpcRoute({ request, reply, deps }));
  server.get('/api/events', (request, reply) => handleEventsRoute({ request, reply, deps }));
  server.setNotFoundHandler((request, reply) => handleStaticRoute({ request, reply, deps }));
}
