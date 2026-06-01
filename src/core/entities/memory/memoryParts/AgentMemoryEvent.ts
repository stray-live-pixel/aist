import { AgentMemoryScope } from './AgentMemoryScope';

export type AgentMemoryEvent = {
  timestamp: number;
  action: 'add' | 'delete' | 'setEnabled';
  scope: AgentMemoryScope;
  itemId: string;
  enabled?: boolean;
};
