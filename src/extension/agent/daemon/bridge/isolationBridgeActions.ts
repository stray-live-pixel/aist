import type {
  DaemonIsolationDestroyResult,
  DaemonIsolationEventsResult,
  DaemonIsolationStartResult,
  DaemonIsolationStopResult,
  IsolationSessionSummary
} from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { getBridgeClient } from './getBridgeClient';

export async function startBridgeIsolationSession({
  context,
  prompt
}: {
  context: BridgeRuntimeContext;
  prompt: string;
}): Promise<IsolationSessionSummary> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonIsolationStartResult>('isolation.start', { prompt });
  context.state.isolationSessions = [result.session, ...context.state.isolationSessions];
  return result.session;
}

export async function continueBridgeIsolationSession({
  context,
  sessionId,
  prompt
}: {
  context: BridgeRuntimeContext;
  sessionId: string;
  prompt: string;
}): Promise<IsolationSessionSummary> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonIsolationStartResult>('isolation.continue', { sessionId, prompt });
  upsertIsolationSession(context, result.session);
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
