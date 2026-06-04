import type {
  DaemonChatGetResult,
  DaemonIsolationDestroyResult,
  DaemonIsolationEventsResult,
  DaemonIsolationRemoteServerDeleteResult,
  DaemonIsolationRemoteServerUpsertResult,
  DaemonIsolationStartResult,
  DaemonIsolationStopResult,
  IsolationRemoteServerInput,
  IsolationRemoteServerSettings,
  IsolationSessionSummary
} from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { getBridgeClient } from './getBridgeClient';

export async function startBridgeIsolationSession({
  context,
  prompt,
  flowId,
  runner
}: {
  context: BridgeRuntimeContext;
  prompt: string;
  flowId?: string;
  runner?: { provider?: 'docker-local' | 'remote-server'; runnerId?: string };
}): Promise<IsolationSessionSummary> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonIsolationStartResult>('isolation.start', { prompt, flowId, ...runner });
  context.state.isolationSessions = [result.session, ...context.state.isolationSessions];
  await refreshIsolationSessionChat({ context, session: result.session });
  return result.session;
}

export async function upsertBridgeIsolationRemoteServer({
  context,
  server
}: {
  context: BridgeRuntimeContext;
  server: IsolationRemoteServerInput;
}): Promise<IsolationRemoteServerSettings> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonIsolationRemoteServerUpsertResult>('isolation.remoteServers.upsert', server);
  context.state.isolationRemoteServers = [
    result.server,
    ...context.state.isolationRemoteServers.filter((candidate) => candidate.id !== result.server.id)
  ];
  const runnersResult = await client.request<{ runners: typeof context.state.isolationRunners }>('isolation.runners');
  context.state.isolationRunners = [...runnersResult.runners];
  return result.server;
}

export async function deleteBridgeIsolationRemoteServer({
  context,
  serverId
}: {
  context: BridgeRuntimeContext;
  serverId: string;
}): Promise<boolean> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonIsolationRemoteServerDeleteResult>('isolation.remoteServers.delete', { serverId });
  if (result.deleted) {
    context.state.isolationRemoteServers = context.state.isolationRemoteServers.filter((server) => server.id !== serverId);
    const runnersResult = await client.request<{ runners: typeof context.state.isolationRunners }>('isolation.runners');
    context.state.isolationRunners = [...runnersResult.runners];
  }
  return result.deleted;
}

export async function continueBridgeIsolationSession({
  context,
  sessionId,
  prompt,
  flowId
}: {
  context: BridgeRuntimeContext;
  sessionId: string;
  prompt: string;
  flowId?: string;
}): Promise<IsolationSessionSummary> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonIsolationStartResult>('isolation.continue', { sessionId, prompt, flowId });
  upsertIsolationSession(context, result.session);
  await refreshIsolationSessionChat({ context, session: result.session });
  return result.session;
}

export async function stopBridgeIsolationSession({
  context,
  sessionId
}: {
  context: BridgeRuntimeContext;
  sessionId: string;
}): Promise<IsolationSessionSummary | null> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonIsolationStopResult>('isolation.stop', { sessionId });
  if (result.session) upsertIsolationSession(context, result.session);
  return result.session;
}

export async function destroyBridgeIsolationSession({
  context,
  sessionId
}: {
  context: BridgeRuntimeContext;
  sessionId: string;
}): Promise<IsolationSessionSummary | null> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonIsolationDestroyResult>('isolation.destroy', { sessionId });
  if (result.session) upsertIsolationSession(context, result.session);
  return result.session;
}

export async function getBridgeIsolationEvents({
  context,
  sessionId
}: {
  context: BridgeRuntimeContext;
  sessionId: string;
}): Promise<DaemonIsolationEventsResult['events']> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonIsolationEventsResult>('isolation.getEvents', { sessionId });
  return result.events;
}

export function upsertIsolationSession(context: BridgeRuntimeContext, session: IsolationSessionSummary): void {
  context.state.isolationSessions = [
    session,
    ...context.state.isolationSessions.filter((candidate) => candidate.sessionId !== session.sessionId)
  ].sort((left, right) => right.updatedAt - left.updatedAt);
}

/**
 * Что это: подтягивает стандартный чат isolated-сессии сразу после start/continue.
 * Зачем нужно: кнопка «Open chat» может открыть обычную вкладку без ожидания следующего daemon event.
 * Какую продуктовую проблему решает: пользователь сразу видит live-чат Docker-агента вместо пустой вкладки.
 */
async function refreshIsolationSessionChat({
  context,
  session
}: {
  context: BridgeRuntimeContext;
  session: IsolationSessionSummary;
}): Promise<void> {
  if (!session.chatId) {
    return;
  }

  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonChatGetResult>('chat.get', { chatId: session.chatId });
  context.chats.upsert(result.chat);
}
