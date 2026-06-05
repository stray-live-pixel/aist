import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AgentWebRpcRequest, AgentWebRpcResponse } from '../../../../agentWebTypes';
import type { CreateServerDeps } from '../../../createServer';
import { mapRpcError } from './mapRpcError';

export async function handleRpcRoute({
  request,
  reply,
  deps
}: {
  readonly request: FastifyRequest;
  readonly reply: FastifyReply;
  readonly deps: Pick<CreateServerDeps, 'daemonClient'>;
}): Promise<FastifyReply> {
  try {
    const payload = request.body as AgentWebRpcRequest;
    if (!payload || typeof payload.method !== 'string') {
      throw new Error('RPC request requires a method.');
    }

    const result = await deps.daemonClient.request(payload.method, payload.params);
    return reply.code(200).send({ ok: true, result } satisfies AgentWebRpcResponse);
  } catch (error) {
    return reply.code(200).send({ ok: false, error: mapRpcError({ error }) } satisfies AgentWebRpcResponse);
  }
}
