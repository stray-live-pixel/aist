import { AgentMemoryItem } from './AgentMemoryItem';

export type StoredMemory = {
  version?: number;
  items?: AgentMemoryItem[];
};
