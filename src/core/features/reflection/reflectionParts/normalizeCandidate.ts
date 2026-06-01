import { type AgentReflectionCandidate } from '../../../shared/types/types';
import { MAX_CANDIDATE_CONTENT_CHARS } from './MAX_CANDIDATE_CONTENT_CHARS';
import { MAX_CANDIDATE_TITLE_CHARS } from './MAX_CANDIDATE_TITLE_CHARS';
import { MAX_FIELD_CHARS } from './MAX_FIELD_CHARS';
import { RawReflectionCandidate } from './RawReflectionCandidate';
import { containsUnsafeReflectionContent } from './containsUnsafeReflectionContent';
import { createReflectionCandidateId } from './createReflectionCandidateId';
import { normalizeCandidateKind } from './normalizeCandidateKind';
import { normalizeCandidateScope } from './normalizeCandidateScope';
import { sanitizeCandidateText } from './sanitizeCandidateText';

export function normalizeCandidate(raw: unknown, now: number): AgentReflectionCandidate | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const record = raw as RawReflectionCandidate;
  const kind = normalizeCandidateKind(record.kind);
  const title = sanitizeCandidateText(record.title, MAX_CANDIDATE_TITLE_CHARS);
  const content = sanitizeCandidateText(record.content, MAX_CANDIDATE_CONTENT_CHARS);
  const reason = sanitizeCandidateText(record.reason, MAX_FIELD_CHARS);
  const scope = normalizeCandidateScope(record.scope, kind);

  if (!kind || !title || !content || containsUnsafeReflectionContent(`${title}\n${content}\n${reason || ''}`)) {
    return undefined;
  }

  return {
    id: createReflectionCandidateId(kind, content, now),
    kind,
    title,
    content,
    reason,
    scope,
    status: 'pending',
    createdAt: now
  };
}
