import { AgentItemScope } from './AgentItemScope';
import { AgentModeItem } from './AgentModeItem';
import { normalizeStoredModes } from './normalizeStoredModes';

export function normalizeModes(raw: unknown, scope: AgentItemScope): AgentModeItem[] {
  return normalizeStoredModes(raw).map((item) => ({ ...item, scope, kind: 'mode' }));
}
