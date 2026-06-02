import { AgentItemRef } from './AgentItemRef';
import { normalizeItemRef } from './normalizeItemRef';

export function normalizeItemRefs(raw: unknown[]): AgentItemRef[] {
  return raw.map(normalizeItemRef).filter(Boolean) as AgentItemRef[];
}
