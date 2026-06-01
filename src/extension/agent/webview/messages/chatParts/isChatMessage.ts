import { type WebviewMessage } from '../../../types';
import { ChatMessage } from './ChatMessage';

export function isChatMessage(message: WebviewMessage): message is ChatMessage {
  return [
    'ask',
    'newChat',
    'duplicateChat',
    'deleteChat',
    'setActiveChat',
    'openChatInEditor',
    'openChatJson',
    'compactChat',
    'setModel',
    'setChatModelSettings',
    'resetChatModelSettings',
    'clear',
    'copyMessage'
  ].includes(message.type);
}
