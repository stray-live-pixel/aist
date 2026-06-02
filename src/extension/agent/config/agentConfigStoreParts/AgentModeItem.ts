import { AgentItemScope } from './AgentItemScope';

export type AgentModeItem = {
  id: string;
  label: string;
  instructions: string;
  scope: AgentItemScope;
  kind: 'mode';
};
