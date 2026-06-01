import { AgentItemRef } from './AgentItemRef';
import { AgentItemScope } from './AgentItemScope';

export type AgentPromptPreset = {
  id: string;
  label: string;
  instructionRefs: AgentItemRef[];
  modeRef?: AgentItemRef;
  scope: AgentItemScope;
};
