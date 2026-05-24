import * as vscode from 'vscode';

import type { ChatStore } from './chatStore';
import type { ChatSummary } from './types';

export class ChatTreeProvider implements vscode.TreeDataProvider<ChatSummary> {
  private readonly changedEmitter = new vscode.EventEmitter<ChatSummary | undefined | null | void>();

  readonly onDidChangeTreeData = this.changedEmitter.event;

  constructor(private readonly store: ChatStore) {
    this.store.onDidChange(() => this.refresh());
  }

  refresh(): void {
    this.changedEmitter.fire();
  }

  getTreeItem(chat: ChatSummary): vscode.TreeItem {
    const item = new vscode.TreeItem(chat.title, vscode.TreeItemCollapsibleState.None);
    item.id = chat.id;
    item.description = chat.busy ? 'running' : chat.model;
    item.tooltip = `${chat.title}\n${chat.model}`;
    item.iconPath = new vscode.ThemeIcon(chat.busy ? 'sync~spin' : 'comment-discussion');
    item.command = {
      command: 'openrouterAgent.openChat',
      title: 'Open Chat',
      arguments: [chat.id]
    };
    return item;
  }

  getChildren(): ChatSummary[] {
    return this.store.getSummaries();
  }
}
