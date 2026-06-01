import { AgentMemoryScope } from './AgentMemoryScope';
import { AgentMemoryStore } from './AgentMemoryStore';

export async function deleteAgentMemory(
  store: AgentMemoryStore,
  scope: AgentMemoryScope,
  id: string
): Promise<boolean> {
  return store.delete(scope, id);
}
