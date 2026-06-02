import { AgentMemoryItem } from './AgentMemoryItem';
import { AgentMemoryStore } from './AgentMemoryStore';
import { PROMPT_MEMORY_LIMIT } from './PROMPT_MEMORY_LIMIT';
import { formatMemoryPromptBlock } from './formatMemoryPromptBlock';
import { sanitizeMemoryNote } from './sanitizeMemoryNote';
import { scoreMemory } from './scoreMemory';
import { tokenize } from './tokenize';

export class MemoryRetriever {
  constructor(private readonly store: AgentMemoryStore) {}

  retrieve(prompt: string, limit = PROMPT_MEMORY_LIMIT): AgentMemoryItem[] {
    const promptTokens = tokenize(prompt);
    return this.store
      .list()
      .filter((item) => item.enabled && sanitizeMemoryNote(item.note))
      .map((item) => ({ item, score: scoreMemory(item.note, promptTokens) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score || right.item.updatedAt - left.item.updatedAt)
      .slice(0, Math.max(0, limit))
      .map(({ item }) => item);
  }

  formatPromptBlock(prompt: string, limit = PROMPT_MEMORY_LIMIT): string {
    return formatMemoryPromptBlock(this.retrieve(prompt, limit));
  }
}
