import * as vscode from 'vscode';

import { AgentController } from './extension/agent/agentController';
import { ChatStore } from './extension/chats/chatStore';
import { DEFAULT_MODEL } from './extension/shared/constants';
import { createLogger } from './extension/shared/logger';

export function activate(context: vscode.ExtensionContext): void {
  const logger = createLogger();
  const viewContribution = getViewContribution(context, 'openrouterAgent.chats');

  logger.info('Activating extension', {
    extensionId: context.extension.id,
    extensionPath: context.extensionPath,
    extensionMode: vscode.ExtensionMode[context.extensionMode],
    version: context.extension.packageJSON?.version,
    viewContribution
  });

  const configModel = vscode.workspace.getConfiguration('openrouterAgent').get<string>('model') || DEFAULT_MODEL;
  const chats = new ChatStore(context.workspaceState, configModel);
  const agent = new AgentController(context, chats, logger);

  logger.info('Registering WebviewViewProvider', { viewId: 'openrouterAgent.chats' });

  context.subscriptions.push(
    logger,
    vscode.window.registerWebviewViewProvider('openrouterAgent.chats', agent),
    vscode.commands.registerCommand('openrouterAgent.openChat', (chatId?: string) => agent.openChat(chatId)),
    vscode.commands.registerCommand('openrouterAgent.openChatInEditor', (chatId?: string) =>
      agent.openChatInEditor(chatId)
    ),
    vscode.commands.registerCommand('openrouterAgent.openSettings', () => agent.openSettings()),
    vscode.commands.registerCommand('openrouterAgent.openStorage', () => agent.openStorage()),
    vscode.commands.registerCommand('openrouterAgent.newChat', () => agent.createChat()),
    vscode.commands.registerCommand('openrouterAgent.editSelection', () => agent.editSelection()),
    vscode.commands.registerCommand('openrouterAgent.codexLogin', () => agent.loginCodex()),
    vscode.commands.registerCommand('openrouterAgent.codexLogout', () => agent.logoutCodex()),
    vscode.commands.registerCommand('openrouterAgent.showLogs', () => logger.show())
  );

  logger.info('Extension activated');
}

export function deactivate(): void {}

function getViewContribution(context: vscode.ExtensionContext, viewId: string): unknown {
  const views = context.extension.packageJSON?.contributes?.views;
  if (!views || typeof views !== 'object') {
    return undefined;
  }

  for (const [containerId, contributedViews] of Object.entries(views)) {
    if (!Array.isArray(contributedViews)) {
      continue;
    }

    const match = contributedViews.find(
      (view) => view && typeof view === 'object' && 'id' in view && view.id === viewId
    );
    if (match) {
      return { containerId, view: match };
    }
  }

  return undefined;
}
