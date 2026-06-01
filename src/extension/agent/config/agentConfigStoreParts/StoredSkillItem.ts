import { AgentItemScope } from './AgentItemScope';

export type StoredSkillItem = {
  id: string;
  label: string;
  description: string;
  command: string;
  permission: 'ask' | 'auto';
  scope?: AgentItemScope;
};
