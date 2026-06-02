import { AgentMemoryScope } from './AgentMemoryScope';
import { AgentMemoryStore } from './AgentMemoryStore';

export async function setAgentMemoryEnabled(
  store: AgentMemoryStore,
  scope: AgentMemoryScope,
  id: string,
  enabled: boolean
): Promise<boolean> {
  return store.setEnabled(scope, id, enabled);
}
