import { type AgentReflectionCandidate, type ChatMessage } from '../../../../types';

export function filterRunCandidates(input: {
  message: ChatMessage;
  runId?: string;
  candidates: AgentReflectionCandidate[];
}): AgentReflectionCandidate[] {
  const candidateIds = Array.isArray(input.message.result?.candidateIds)
    ? new Set(input.message.result.candidateIds.filter((id): id is string => typeof id === 'string'))
    : undefined;

  return input.candidates.filter((candidate) => {
    if (candidate.status !== 'pending') {
      return false;
    }
    if (candidateIds) {
      return candidateIds.has(candidate.id);
    }
    return Boolean(input.runId && candidate.sourceSubagentRunId === input.runId);
  });
}
