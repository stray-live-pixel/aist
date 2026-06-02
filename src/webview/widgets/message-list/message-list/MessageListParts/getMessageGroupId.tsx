import { type MessageGroup } from '../types';

export function getMessageGroupId(group: MessageGroup): string {
  return group.type === 'toolCalls' ? group.id : group.message.id;
}
