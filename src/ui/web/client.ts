import type { AgentWebEventMessage, AgentWebRpcRequest, AgentWebRpcResponse } from './agentWebTypes';

export async function rpc<T>(method: string, params?: unknown): Promise<T> {
  const response = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ method, params } satisfies AgentWebRpcRequest)
  });
  const payload = (await response.json()) as AgentWebRpcResponse<T>;
  if (payload.ok) {
    return payload.result;
  }

  throw new Error(payload.error.message);
}

export function subscribeToEvents(onMessage: (message: AgentWebEventMessage) => void, onError: () => void): () => void {
  const source = new EventSource('/api/events');
  source.onmessage = (event) => {
    onMessage(JSON.parse(event.data) as AgentWebEventMessage);
  };
  source.onerror = () => onError();

  return () => source.close();
}
