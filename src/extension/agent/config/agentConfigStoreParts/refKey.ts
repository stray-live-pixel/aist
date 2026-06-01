import { AgentItemRef } from './AgentItemRef';

export function refKey(ref: AgentItemRef): string {
  return `${ref.scope}:${ref.id}`;
}
