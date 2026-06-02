import { type AgentReflectionCandidateKind } from '../../../shared/types/types';

export function createReflectionCandidateId(kind: AgentReflectionCandidateKind, content: string, now: number): string {
  const base =
    content
      .toLowerCase()
      .slice(0, 42)
      .replace(/[^a-z0-9\u0400-\u04ff]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'candidate';
  return `${kind}-${base}-${now.toString(36)}`;
}
