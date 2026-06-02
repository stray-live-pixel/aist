import { AgentMemoryItem } from './AgentMemoryItem';
import { AgentMemoryStore } from './AgentMemoryStore';

export function getAgentMemoryItems(store: AgentMemoryStore): AgentMemoryItem[] {
  return store.list();
}
