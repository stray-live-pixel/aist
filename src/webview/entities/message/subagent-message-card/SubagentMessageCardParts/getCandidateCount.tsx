import { type AgentReflectionCandidate, type ChatMessage, type SubagentRun } from '../../../../shared/types';

export function getCandidateCount(input: {
  message: ChatMessage;
  subagentRun?: SubagentRun;
  candidates: AgentReflectionCandidate[];
}): number {
  const fromMessage = input.message.result?.candidateCount;
  if (typeof fromMessage === 'number') {
    return fromMessage;
  }

  if (
    input.subagentRun?.result &&
    typeof input.subagentRun.result === 'object' &&
    'candidateCount' in input.subagentRun.result
  ) {
    const candidateCount = (input.subagentRun.result as { candidateCount?: unknown }).candidateCount;
    if (typeof candidateCount === 'number') {
      return candidateCount;
    }
  }

  return input.candidates.length;
}
