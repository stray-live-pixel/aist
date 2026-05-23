import * as vscode from 'vscode';
import { AgentController } from './extension/agent/agentController';
import { ChatStore } from './extension/chats/chatStore';
import { ChatTreeProvider } from './extension/chats/chatTreeProvider';
import { DEFAULT_MODEL } from './extension/shared/constants';

export function activate(context: vscode.ExtensionContext): void {
  const configModel = vscode.workspace.getConfiguration('openrouterAgent').get<string>('model') || DEFAULT_MODEL;
  const chats = new ChatStore(configModel);
  const agent = new AgentController(context, chats);
  const chatTreeProvider = new ChatTreeProvider(chats);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('openrouterAgent.chats', chatTreeProvider),
    vscode.commands.registerCommand('openrouterAgent.openChat', (chatId?: string) => agent.openChat(chatId)),
    vscode.commands.registerCommand('openrouterAgent.newChat', () => agent.createChat()),
    vscode.commands.registerCommand('openrouterAgent.editSelection', () => agent.editSelection())
  );
}

export function deactivate(): void {}
