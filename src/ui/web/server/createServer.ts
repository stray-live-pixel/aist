import Fastify, { type FastifyInstance } from 'fastify';
import type { ServerResponse } from 'node:http';

import type { DaemonJsonRpcClient } from '../../../cli/daemonClient/DaemonJsonRpcClient';
import { registerRoutes } from './routes';

export type CreateServerDeps = {
  readonly daemonClient: DaemonJsonRpcClient;
  readonly eventClients: Set<ServerResponse>;
  readonly staticRoot: string;
};

export function createServer({ deps }: { readonly deps: CreateServerDeps }): FastifyInstance {
  const server = Fastify({ logger: false });
  registerRoutes({ server, deps });
  return server;
}
