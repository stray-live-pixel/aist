import type { FastifyReply, FastifyRequest } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';

import type { CreateServerDeps } from '../../createServer';
import { resolveContentType } from '../../utils/fs/resolveContentType';

export async function handleStaticRoute({
  request,
  reply,
  deps
}: {
  readonly request: FastifyRequest;
  readonly reply: FastifyReply;
  readonly deps: Pick<CreateServerDeps, 'staticRoot'>;
}): Promise<FastifyReply | void> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return reply.code(405).send('Method not allowed');
  }

  const url = new URL(request.raw.url || '/', 'http://localhost');
  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.resolve(deps.staticRoot, `.${decodeURIComponent(requestedPath)}`);
  if (!filePath.startsWith(deps.staticRoot)) {
    return reply.code(403).send('Forbidden');
  }

  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) {
      return reply.code(404).send('Not found');
    }

    reply.header('content-type', resolveContentType({ filePath }));
    if (request.method === 'HEAD') {
      return reply.code(200).send();
    }
    return reply.code(200).send(fs.createReadStream(filePath));
  } catch {
    return reply.code(404).send('Not found');
  }
}
