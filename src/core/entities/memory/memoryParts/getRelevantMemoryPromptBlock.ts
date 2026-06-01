import { AgentMemoryStore } from './AgentMemoryStore';
import { MemoryRetriever } from './MemoryRetriever';

export function getRelevantMemoryPromptBlock(store: AgentMemoryStore, prompt: string): string {
  return new MemoryRetriever(store).formatPromptBlock(prompt);
}
