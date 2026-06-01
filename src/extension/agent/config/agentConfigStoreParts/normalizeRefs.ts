import { AgentInstructionItem } from './AgentInstructionItem';
import { AgentItemRef } from './AgentItemRef';
import { normalizeItemRefs } from './normalizeItemRefs';

export function normalizeRefs(
  refs: AgentItemRef[],
  globalInstructions: AgentInstructionItem[],
  localInstructions: AgentInstructionItem[]
): AgentItemRef[] {
  const all = [...globalInstructions, ...localInstructions];
  return normalizeItemRefs(refs).filter((ref) => all.some((item) => item.scope === ref.scope && item.id === ref.id));
}
