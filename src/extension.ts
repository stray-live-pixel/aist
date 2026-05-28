import * as vscode from 'vscode';

import { AgentController } from './extension/agent/agentController';
import { type VscodeDaemonRuntimeBridge, createVscodeDaemonRuntimeBridge } from './extension/agent/daemon/bridge';
import { AutonomousController } from './extension/autonomous/controller';
import { DEFAULT_MODEL } from './extension/shared/constants';
import { createLogger } from './extension/shared/logger';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
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
  const daemonRuntime = await createRequiredDaemonRuntimeBridge(context, logger, configModel);
  const agent = new AgentController(context, daemonRuntime.chats, logger, daemonRuntime);
  const autonomous = new AutonomousController(context, logger, { daemonRuntime });

  logger.info('Registering WebviewViewProvider', { viewId: 'openrouterAgent.chats' });

  context.subscriptions.push(
    logger,
    autonomous,
    vscode.window.registerWebviewViewProvider('openrouterAgent.chats', agent),
    vscode.commands.registerCommand('openrouterAgent.openChat', (chatId?: string) => agent.openChat(chatId)),
    vscode.commands.registerCommand('openrouterAgent.openChats', () => agent.openChats()),
    vscode.commands.registerCommand('openrouterAgent.openChatInEditor', (chatId?: string) =>
      agent.openChatInEditor(chatId)
    ),
    vscode.commands.registerCommand('openrouterAgent.openSettings', () => agent.openSettings()),
    vscode.commands.registerCommand('openrouterAgent.openAutonomous', () => autonomous.open()),
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

async function createRequiredDaemonRuntimeBridge(
  context: vscode.ExtensionContext,
  logger: ReturnType<typeof createLogger>,
  configModel: string
): Promise<VscodeDaemonRuntimeBridge> {
  try {
    return await createVscodeDaemonRuntimeBridge(context, logger, configModel);
  } catch (error) {
    logger.error('Failed to initialize required VS Code daemon runtime bridge', error);
    void vscode.window.showErrorMessage(
      'AIST daemon is required and could not start. Fix daemon diagnostics or configure openrouterAgent.daemonBinaryPath, then reload the window.'
    );
    throw error;
  }
}

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
