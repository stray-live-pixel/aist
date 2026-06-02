import { AgentItemRef } from './AgentItemRef';
import { AgentModeItem } from './AgentModeItem';
import { normalizeItemRef } from './normalizeItemRef';

export function normalizeModeRef(
  ref: AgentItemRef | undefined,
  globalModes: AgentModeItem[],
  localModes: AgentModeItem[]
): AgentItemRef | undefined {
  const normalized = normalizeItemRef(ref);
  if (!normalized) return undefined;
  return [...globalModes, ...localModes].some((item) => item.scope === normalized.scope && item.id === normalized.id)
    ? normalized
    : undefined;
}
