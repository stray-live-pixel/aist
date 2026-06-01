import { AgentMemoryCandidate } from './AgentMemoryCandidate';
import { AgentMemoryItem } from './AgentMemoryItem';
import { AgentMemoryStore } from './AgentMemoryStore';

export async function addAgentMemory(
  store: AgentMemoryStore,
  candidate: AgentMemoryCandidate
): Promise<AgentMemoryItem | undefined> {
  return store.add(candidate);
}
