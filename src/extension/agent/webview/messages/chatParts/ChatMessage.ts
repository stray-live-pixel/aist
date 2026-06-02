import { type WebviewMessage } from '../../../types';

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
