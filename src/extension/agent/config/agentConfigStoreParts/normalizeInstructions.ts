import { AgentInstructionItem } from './AgentInstructionItem';
import { AgentItemScope } from './AgentItemScope';
import { normalizeStoredInstructions } from './normalizeStoredInstructions';

export function normalizeInstructions(raw: unknown, scope: AgentItemScope): AgentInstructionItem[] {
  return normalizeStoredInstructions(raw).map((item) => ({ ...item, scope, kind: 'instruction' }));
}
