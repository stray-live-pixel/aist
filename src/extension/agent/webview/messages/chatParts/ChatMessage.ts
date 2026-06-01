import { type WebviewMessage } from '../../../types';
import { compactChat } from './compactChat';
import { deleteChat } from './deleteChat';
import { duplicateChat } from './duplicateChat';
import { openChatJson } from './openChatJson';
import { setActiveChat } from './setActiveChat';
import { setChatModelSettings } from './setChatModelSettings';
import { setModel } from './setModel';

export type ChatMessage = Extract<
  WebviewMessage,
  | { type: 'ask' }
  | { type: 'newChat' }
  | { type: 'duplicateChat' }
  | { type: 'deleteChat' }
  | { type: 'setActiveChat' }
  | { type: 'openChatInEditor' }
  | { type: 'openChatJson' }
  | { type: 'compactChat' }
  | { type: 'setModel' }
  | { type: 'setChatModelSettings' }
  | { type: 'resetChatModelSettings' }
  | { type: 'clear' }
  | { type: 'copyMessage' }
>;
