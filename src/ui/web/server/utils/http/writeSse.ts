import type { ServerResponse } from 'node:http';

import type { AgentWebEventMessage } from '../../../../shared/agentWebTypes';

export function writeSse({
  response,
  message
}: {
  readonly response: ServerResponse;
  readonly message: AgentWebEventMessage;
}): void {
  response.write(`data: ${JSON.stringify(message)}\n\n`);
}

export function writeSseToClients({
  clients,
  message
}: {
  readonly clients: Set<ServerResponse>;
  readonly message: AgentWebEventMessage;
}): void {
  for (const client of clients) {
    writeSse({ response: client, message });
  }
}
