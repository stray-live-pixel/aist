import { type AgentReflectionCandidateKind } from '../../../shared/types/types';

export function normalizeCandidateScope(value: unknown, kind: AgentReflectionCandidateKind | undefined) {
  const raw = String(value || '');
  if (raw === 'global' || raw === 'project' || raw === 'local') {
    return raw;
  }

  if (kind === 'memory_preference') {
    return 'global';
  }
  if (kind === 'declarative_definition') {
    return 'local';
  }
  return 'project';
}
