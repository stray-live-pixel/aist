import * as vscode from 'vscode';

import type {
  DaemonAutonomousExportResult,
  DaemonAutonomousFlowCreateResult,
  DaemonAutonomousFlowSaveResult,
  DaemonAutonomousImportLegacyResult,
  DaemonAutonomousStateResult,
  DaemonAutonomousStopResult,
  DaemonEvent
} from '../../cli/daemonProtocol';
import {
  AutonomousBackend,
  type AutonomousExportFormat,
  type CreateAutonomousFlowInput,
  type DeleteAutonomousFlowInput,
  type EditableAutonomousFlowDefinition
} from '../../core/processes/autonomous';
import type { VscodeDaemonRuntimeBridge } from '../agent/daemon/bridge';
import type { AistLogger } from '../shared/logger';
import { getWebviewHtml } from '../shared/webviewHtml';
import { getWorkspaceFolder, getWorkspaceName } from '../shared/workspace';
import { confirmAutonomousFlowDelete } from './controller/confirmAutonomousFlowDelete';
import { deleteAutonomousFlowDirectory } from './controller/deleteAutonomousFlowDirectory';
import { openAutonomousSessionExportDocument } from './controller/openAutonomousSessionExportDocument';
import { revealAutonomousSessionDirectory } from './controller/revealAutonomousSessionDirectory';
import type { AutonomousWebviewToExtensionMessage } from './messages';

/**
 * Что это: VS Code shell для редактора autonomous workflows.
 * Зачем нужно: controller открывает panel и маршрутизирует webview IPC в daemon или local backend.
 * Какую проблему решает: workflow definitions остаются в core/backend, а UI получает единый state.
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

  openWorkflows(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      void this.postRoute('flows');
      void this.sendState();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'openrouterAgentAutonomous',
      'aist: Workflows',
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
    void this.postRoute('flows');
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
        await this.importLegacyDefinitions();
      } else if (message.type === 'autonomous.createFlow') {
        await this.createFlow(message.flow);
      } else if (message.type === 'autonomous.deleteFlow') {
        await this.deleteFlow(message.flow);
      } else if (message.type === 'autonomous.saveFlow') {
        await this.saveFlow(message.flow);
      } else if (message.type === 'autonomous.stopSession') {
        await this.stopSession(message.sessionId);
      } else if (message.type === 'autonomous.revealSession') {
        await revealAutonomousSessionDirectory({ sessionId: message.sessionId });
      } else if (message.type === 'autonomous.exportSession') {
        await this.exportSession(message.sessionId, message.format);
      }
    } catch (error) {
      await this.reportMessageError({ error });
    } finally {
      await this.sendState();
    }
  }

  private async importLegacyDefinitions(): Promise<void> {
    if (this.options.daemonRuntime) {
      const client = await this.options.daemonRuntime.processManager.getClient();
      await client.request<DaemonAutonomousImportLegacyResult>('autonomous.importLegacy');
      await this.options.daemonRuntime.refreshState();
      return;
    }

    await this.getBackend().importLegacyDefinitions();
  }

  private async createFlow(flow: CreateAutonomousFlowInput): Promise<void> {
    if (this.options.daemonRuntime) {
      const client = await this.options.daemonRuntime.processManager.getClient();
      await client.request<DaemonAutonomousFlowCreateResult>('autonomous.flow.create', { flow });
      await this.options.daemonRuntime.refreshState();
      return;
    }

    await this.getBackend().createFlow(flow);
  }

  private async saveFlow(flow: EditableAutonomousFlowDefinition): Promise<void> {
    if (this.options.daemonRuntime) {
      const client = await this.options.daemonRuntime.processManager.getClient();
      await client.request<DaemonAutonomousFlowSaveResult>('autonomous.flow.save', { flow });
      await this.options.daemonRuntime.refreshState();
      return;
    }

    await this.getBackend().saveFlow(flow);
  }

  private async stopSession(sessionId: string): Promise<void> {
    if (this.options.daemonRuntime) {
      const client = await this.options.daemonRuntime.processManager.getClient();
      await client.request<DaemonAutonomousStopResult>('autonomous.stop', { sessionId });
    } else {
      this.getBackend().stop(sessionId);
    }
  }

  private async deleteFlow(flow: DeleteAutonomousFlowInput): Promise<void> {
    if (!(await confirmAutonomousFlowDelete({ flowId: flow.id }))) {
      await this.postAutonomousOperation({ operation: 'deleteFlow', flowId: flow.id, status: 'cancelled' });
      return;
    }

    try {
      await deleteAutonomousFlowDirectory({ workspaceRoot: getWorkspaceFolder().uri.fsPath, flow });
      if (this.options.daemonRuntime) {
        await this.options.daemonRuntime.refreshState();
      }

      await this.sendState();
      await this.postAutonomousOperation({ operation: 'deleteFlow', flowId: flow.id, status: 'done' });
    } catch (error) {
      await this.postAutonomousOperation({ operation: 'deleteFlow', flowId: flow.id, status: 'error' });
      throw error;
    }
  }

  private async exportSession(sessionId: string, format: 'markdown' | 'json'): Promise<void> {
    const content = await this.exportSessionDocument(sessionId, format);
    await openAutonomousSessionExportDocument({ content, format });
  }

  private async postPage(): Promise<void> {
    await this.panel?.webview.postMessage({ type: 'page', page: 'autonomous' });
  }

  private async postRoute(route: 'flows'): Promise<void> {
    await this.panel?.webview.postMessage({ type: 'autonomous.route', route });
  }

  private async postAutonomousOperation({
    operation,
    flowId,
    status
  }: {
    operation: 'deleteFlow';
    flowId: string;
    status: 'done' | 'cancelled' | 'error';
  }): Promise<void> {
    await this.panel?.webview.postMessage({ type: 'autonomous.operation', operation, flowId, status });
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

  private async reportMessageError({ error }: { error: unknown }): Promise<void> {
    const text = error instanceof Error ? error.message : String(error);
    this.logger.error('Autonomous webview message failed', error);
    await this.panel?.webview.postMessage({ type: 'autonomous.error', message: text });
  }
}
