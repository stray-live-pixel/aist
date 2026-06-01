import { type AgentReflectionCandidate } from '../../../shared/types/types';
import { parseJsonObject } from './parseJsonObject';
import { validateReflectionCandidates } from './validateReflectionCandidates';

export function parseReflectionResponse(content: string, now = Date.now()): AgentReflectionCandidate[] {
  const parsed = parseJsonObject(content);
  const rawCandidates = Array.isArray(parsed?.candidates) ? parsed.candidates : [];
  return validateReflectionCandidates(rawCandidates, now);
}
