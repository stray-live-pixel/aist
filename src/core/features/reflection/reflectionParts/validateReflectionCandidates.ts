import { type AgentReflectionCandidate } from '../../../shared/types/types';
import { MAX_CANDIDATES } from './MAX_CANDIDATES';
import { normalizeCandidate } from './normalizeCandidate';

export function validateReflectionCandidates(input: unknown, now = Date.now()): AgentReflectionCandidate[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const candidates: AgentReflectionCandidate[] = [];
  const seen = new Set<string>();

  for (const raw of input.slice(0, MAX_CANDIDATES)) {
    const candidate = normalizeCandidate(raw, now);
    if (!candidate) {
      continue;
    }

    const key = `${candidate.kind}:${candidate.scope || ''}:${candidate.content.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    candidates.push(candidate);
  }

  return candidates;
}
