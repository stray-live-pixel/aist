import * as vscode from 'vscode';

import type { Chat } from '../../../chats/types';

/**
 * Что это: mutable-состояние daemon chat store.
 * Зачем нужно: сценарные action-файлы меняют один общий Map чатов и activeChatId.
 * Какую проблему решает: декомпозиция не создаёт разные источники правды для текущего чата.
 */
export type DaemonChatStoreState = {
  readonly chats: Map<string, Chat>;
  readonly changedEmitter: vscode.EventEmitter<void>;
  activeChatId: string | undefined;
};
