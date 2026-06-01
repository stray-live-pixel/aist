import type { ChatModelSettings, ModelProvider } from '../../types';
import { post } from './post';

/**
 * Что это: действия чата и выбора модели активного чата.
 * Зачем нужно: chat UI вызывает продуктовые команды, не зная формат IPC сообщений.
 * Какую проблему решает: сценарии работы с чатом отделены от настроек, prompt manager и VCS.
 */
export const chatActions = {
  webviewReady(): void {
    post({ message: { type: 'webviewReady' } });
  },
  ask(prompt: string, options: { continueWithoutUserPrompt?: boolean } = {}): void {
    post({ message: { type: 'ask', prompt, continueWithoutUserPrompt: options.continueWithoutUserPrompt } });
  },
  stop(chatId?: string): void {
    post({ message: { type: 'stop', chatId } });
  },
  clear(): void {
    post({ message: { type: 'clear' } });
  },
  newChat(): void {
    post({ message: { type: 'newChat' } });
  },
  duplicateChat(chatId: string): void {
    post({ message: { type: 'duplicateChat', chatId } });
  },
  deleteChat(chatId: string): void {
    post({ message: { type: 'deleteChat', chatId } });
  },
  setActiveChat(chatId: string): void {
    post({ message: { type: 'setActiveChat', chatId } });
  },
  openChatInEditor(chatId?: string): void {
    post({ message: { type: 'openChatInEditor', chatId } });
  },
  openChatJson(chatId?: string): void {
    post({ message: { type: 'openChatJson', chatId } });
  },
  setModel(model: string): void {
    post({ message: { type: 'setModel', model } });
  },
  setDefaultModel(model: string): void {
    post({ message: { type: 'setDefaultModel', model } });
  },
  setChatModelSettings(settings: Partial<ChatModelSettings>): void {
    post({ message: { type: 'setChatModelSettings', settings } });
  },
  resetChatModelSettings(): void {
    post({ message: { type: 'resetChatModelSettings' } });
  },
  refreshModelsForProvider(provider: ModelProvider): void {
    post({ message: { type: 'refreshModelsForProvider', provider } });
  },
  compactChat(chatId?: string): void {
    post({ message: { type: 'compactChat', chatId } });
  }
};
