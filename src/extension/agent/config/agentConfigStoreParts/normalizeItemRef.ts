import { AgentItemRef } from './AgentItemRef';

export function normalizeItemRef(raw: unknown): AgentItemRef | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const scope = record.scope === 'global' ? 'global' : record.scope === 'local' ? 'local' : undefined;
  const id = typeof record.id === 'string' ? record.id : undefined;
  return scope && id ? { scope, id } : undefined;
}
