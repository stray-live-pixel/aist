import { type WebviewMessage } from '../../../types';
import { ChatMessage } from './ChatMessage';
import { compactChat } from './compactChat';
import { deleteChat } from './deleteChat';
import { duplicateChat } from './duplicateChat';
import { openChatJson } from './openChatJson';
import { setActiveChat } from './setActiveChat';
import { setChatModelSettings } from './setChatModelSettings';
import { setModel } from './setModel';

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
