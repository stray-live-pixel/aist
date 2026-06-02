import { AgentItemScope } from './AgentItemScope';

export type AgentInstructionItem = {
  id: string;
  label: string;
  content: string;
  scope: AgentItemScope;
  kind: 'instruction';
};
