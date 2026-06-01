import type {
  DaemonChatMemoryAnalyzeResult,
  DaemonChatReflectionCandidateRejectResult,
  DaemonChatReflectionCandidateSaveResult
} from '../../../../cli/daemonProtocol';
import type { BridgeRuntimeContext } from './BridgeRuntimeContext';
import { getBridgeClient } from './getBridgeClient';
import { refreshBridgeSubagentRuns } from './refreshBridgeSubagentRuns';
import { syncBridgeSettings } from './syncBridgeSettings';

/** Анализирует чат memory-субагентом и обновляет related subagent runs. */
export async function analyzeBridgeMemoryChat({
  context,
  chatId
}: {
  context: BridgeRuntimeContext;
  chatId: string;
}): Promise<void> {
  const client = await getBridgeClient({ context });
  await syncBridgeSettings({ context });
  const result = await client.request<DaemonChatMemoryAnalyzeResult>('chat.memoryAnalyze', { chatId });
  context.chats.upsert(result.chat);
  await refreshBridgeSubagentRuns({ context, parentChatId: chatId });
}

/** Сохраняет reflection candidate через daemon. */
export async function saveBridgeReflectionCandidate({
  context,
  chatId,
  candidateId
}: {
  context: BridgeRuntimeContext;
  chatId: string;
  candidateId: string;
}): Promise<void> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonChatReflectionCandidateSaveResult>('chat.reflectionCandidate.save', {
    chatId,
    candidateId
  });
  context.chats.upsert(result.chat);
}

/** Отклоняет reflection candidate через daemon. */
export async function rejectBridgeReflectionCandidate({
  context,
  chatId,
  candidateId
}: {
  context: BridgeRuntimeContext;
  chatId: string;
  candidateId: string;
}): Promise<void> {
  const client = await getBridgeClient({ context });
  const result = await client.request<DaemonChatReflectionCandidateRejectResult>('chat.reflectionCandidate.reject', {
    chatId,
    candidateId
  });
  context.chats.upsert(result.chat);
}
