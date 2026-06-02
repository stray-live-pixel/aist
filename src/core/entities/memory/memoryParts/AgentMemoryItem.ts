import { AgentMemoryScope } from './AgentMemoryScope';

export type AgentMemoryItem = {
  id: string;
  scope: AgentMemoryScope;
  note: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};
