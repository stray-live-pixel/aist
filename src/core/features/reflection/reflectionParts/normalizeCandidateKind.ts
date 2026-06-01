import { type AgentReflectionCandidateKind } from '../../../shared/types/types';
import { REFLECTION_CANDIDATE_KINDS } from './REFLECTION_CANDIDATE_KINDS';

export function normalizeCandidateKind(value: unknown): AgentReflectionCandidateKind | undefined {
  return REFLECTION_CANDIDATE_KINDS.includes(String(value) as AgentReflectionCandidateKind)
    ? (String(value) as AgentReflectionCandidateKind)
    : undefined;
}
