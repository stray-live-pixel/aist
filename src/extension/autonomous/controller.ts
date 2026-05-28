import * as vscode from 'vscode';

import type {
  DaemonAutonomousExportResult,
  DaemonAutonomousStartResult,
  DaemonAutonomousStateResult,
  DaemonAutonomousStopResult,
  DaemonEvent
} from '../../cli/daemonProtocol';
import {
  AutonomousBackend,
  type AutonomousExportFormat,
  type AutonomousLaunchOptions,
  AutonomousSessionStore
} from '../../core/processes/autonomous';
import type { VscodeDaemonRuntimeBridge } from '../agent/daemon/bridge';
import type { AistLogger } from '../shared/logger';
import { getWebviewHtml } from '../shared/webviewHtml';
import { getWorkspaceFolder, getWorkspaceName } from '../shared/workspace';
import type { AutonomousWebviewToExtensionMessage } from './messages';

/**
 * VS Code shell для autonomous runner. Бизнес-логика живёт в core backend или
 * daemon; controller только открывает panel и маршрутизирует webview IPC.
 */
export class AutonomousController implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private backend: AutonomousBackend | undefined;
  private backendUnsubscribe: (() => void) | undefined;
  private daemonUnsubscribe: (() => void) | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly logger: AistLogger,
    private readonly options: { daemonRuntime?: VscodeDaemonRuntimeBridge } = {}
  ) {}

  open(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      void this.sendState();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'openrouterAgentAutonomous',
      'aist: Autonomous Runner',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
          vscode.Uri.joinPath(this.context.extensionUri, 'assets')
        ]
      }
    );
    this.panel.webview.html = getWebviewHtml(this.panel.webview, this.context.extensionUri);
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
    this.panel.webview.onDidReceiveMessage((message: AutonomousWebviewToExtensionMessage) => {
      void this.handleMessage(message);
    });
    void this.postPage();
    void this.ensureDaemonEventSubscription();
    void this.sendState();
  }

  dispose(): void {
    this.daemonUnsubscribe?.();
    this.backendUnsubscribe?.();
    this.backend?.dispose();
  }

  private async handleMessage(message: AutonomousWebviewToExtensionMessage): Promise<void> {
    try {
      if (message.type === 'webviewReady') {
        await this.postPage();
        await this.sendState();
      } else if (message.type === 'autonomous.refresh') {
        await this.sendState();
      } else if (message.type === 'autonomous.importLegacy') {
        await this.getBackend().importLegacyDefinitions();
        await this.sendState();
      } else if (message.type === 'autonomous.createFlow') {
        await this.getBackend().createFlow(message.flow);
        await this.sendState();
      } else if (message.type === 'autonomous.deleteFlow') {
        await this.deleteFlow(message.flowId);
      } else if (message.type === 'autonomous.saveFlow') {
        await this.getBackend().saveFlow(message.flow);
        await this.sendState();
      } else if (message.type === 'autonomous.startFlow') {
        await this.startFlow(message.flowId, message.launch);
      } else if (message.type === 'autonomous.startRun') {
        await this.startRun(message.runId, message.launch);
      } else if (message.type === 'autonomous.stopSession') {
        await this.stopSession(message.sessionId);
      } else if (message.type === 'autonomous.revealSession') {
        await this.revealSession(message.sessionId);
      } else if (message.type === 'autonomous.exportSession') {
        await this.exportSession(message.sessionId, message.format);
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      this.logger.error('Autonomous webview message failed', error);
      await this.panel?.webview.postMessage({ type: 'autonomous.error', message: text });
    } finally {
      await this.sendState();
    }
  }

  private async startFlow(flowId: string, launch: AutonomousLaunchOptions): Promise<void> {
    if (this.options.daemonRuntime) {
      const client = await this.options.daemonRuntime.processManager.getClient();
      await client.request<DaemonAutonomousStartResult>('autonomous.flow.start', { flowId, launch });
    } else {
      await this.getBackend().startFlow(flowId, launch);
    }
    await this.sendState();
  }

  private async startRun(runId: string, launch: AutonomousLaunchOptions): Promise<void> {
    if (this.options.daemonRuntime) {
      const client = await this.options.daemonRuntime.processManager.getClient();
      await client.request<DaemonAutonomousStartResult>('autonomous.run.start', { runId, launch });
    } else {
      await this.getBackend().startRun(runId, launch);
    }
    await this.sendState();
  }

  private async stopSession(sessionId: string): Promise<void> {
    if (this.options.daemonRuntime) {
      const client = await this.options.daemonRuntime.processManager.getClient();
      await client.request<DaemonAutonomousStopResult>('autonomous.stop', { sessionId });
    } else {
      this.getBackend().stop(sessionId);
    }
  }

  private async deleteFlow(flowId: string): Promise<void> {
    const confirmation = 'Удалить flow';
    // Подтверждение держим на стороне extension, потому что это действие меняет
    // workspace-файлы, а browser confirm внутри webview может быть отключён/не показан.
    const selected = await vscode.window.showWarningMessage(
      `Удалить flow ${flowId}? Это удалит каталог definition из .aist-agent/autonomous/flows.`,
      { modal: true },
      confirmation
    );
    if (selected !== confirmation) {
      return;
    }

    await this.getBackend().deleteFlow(flowId);
    await this.sendState();
  }

  private async revealSession(sessionId: string): Promise<void> {
    const sessionUri = vscode.Uri.file(
      new AutonomousSessionStore(getWorkspaceFolder().uri.fsPath).rootPath + `/${sessionId}`
    );
    await vscode.env.openExternal(sessionUri);
  }

  private async exportSession(sessionId: string, format: 'markdown' | 'json'): Promise<void> {
    const result = await this.exportSessionDocument(sessionId, format);
    const document = await vscode.workspace.openTextDocument({
      language: format === 'markdown' ? 'markdown' : 'json',
      content: result
    });
    await vscode.window.showTextDocument(document);
  }

  private async postPage(): Promise<void> {
    await this.panel?.webview.postMessage({ type: 'page', page: 'autonomous' });
  }

  private async sendState(): Promise<void> {
    if (!this.panel) {
      return;
    }

    const state = this.options.daemonRuntime
      ? (
          await (
            await this.options.daemonRuntime.processManager.getClient()
          ).request<DaemonAutonomousStateResult>('autonomous.state')
        ).state
      : await this.getBackend().getState();
    await this.panel.webview.postMessage({ type: 'autonomous.state', state });
  }

  private getBackend(): AutonomousBackend {
    const workspaceRoot = getWorkspaceFolder().uri.fsPath;
    if (this.backend?.workspaceRoot === workspaceRoot) {
      return this.backend;
    }

    this.backendUnsubscribe?.();
    this.backend?.dispose();
    this.backend = new AutonomousBackend({
      workspaceRoot,
      workspaceName: getWorkspaceName(),
      logger: {
        info: (message, details) => this.logger.info(message, details),
        warn: (message, details) => this.logger.info(message, details),
        error: (message, error) => this.logger.error(message, error)
      },
      env: process.env
    });
    this.backendUnsubscribe = this.backend.onEvent(() => {
      void this.sendState();
    });
    return this.backend;
  }

  private async ensureDaemonEventSubscription(): Promise<void> {
    if (!this.options.daemonRuntime || this.daemonUnsubscribe) {
      return;
    }

    const client = await this.options.daemonRuntime.processManager.getClient();
    this.daemonUnsubscribe = client.onEvent((event: DaemonEvent) => {
      if (event.type.startsWith('autonomous.')) {
        void this.sendState();
      }
    });
    await client.subscribe();
  }

  private async exportSessionDocument(sessionId: string, format: AutonomousExportFormat): Promise<string> {
    if (this.options.daemonRuntime) {
      const client = await this.options.daemonRuntime.processManager.getClient();
      const result = await client.request<DaemonAutonomousExportResult>('autonomous.export', { sessionId, format });
      return result.content;
    }

    return (await this.getBackend().exportSession(sessionId, format)).content;
  }
}
