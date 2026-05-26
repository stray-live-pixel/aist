import * as vscode from 'vscode';

import { CodexClient } from '../codex/client';
import { OpenRouterClient } from '../openrouter/client';
import type { AistLogger } from '../shared/logger';
import { getWebviewHtml } from '../shared/webviewHtml';
import { getWorkspaceFolder, getWorkspaceName } from '../shared/workspace';
import { runAutonomousBatch } from './batch/runBatch';
import { discoverAutonomousDefinitions, importLegacyDefinitions } from './discovery';
import { createAutonomousEngineRegistry } from './engines/registry';
import { createSessionId, runAutonomousFlow } from './flow/orchestrator';
import type { AutonomousWebviewToExtensionMessage } from './messages';
import { buildAutonomousState } from './presenter';
import { AutonomousSessionStore } from './storage/sessionStore';
import type { AutonomousLaunchOptions } from './types';

/**
 * VS Code shell для autonomous runner. Бизнес-логика остаётся в discovery,
 * orchestrator и storage; controller только открывает panel, маршрутизирует IPC
 * и хранит AbortController активных sessions.
 */
export class AutonomousController implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private readonly runningSessions = new Map<string, AbortController>();
  private readonly openRouterClient: OpenRouterClient;
  private readonly codexClient: CodexClient;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly logger: AistLogger
  ) {
    this.openRouterClient = new OpenRouterClient(logger);
    this.codexClient = new CodexClient(context, logger);
  }

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
    void this.sendState();
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private async handleMessage(message: AutonomousWebviewToExtensionMessage): Promise<void> {
    try {
      if (message.type === 'webviewReady') {
        await this.postPage();
        await this.sendState();
      } else if (message.type === 'autonomous.refresh') {
        await this.sendState();
      } else if (message.type === 'autonomous.importLegacy') {
        await importLegacyDefinitions(getWorkspaceFolder().uri.fsPath);
        await this.sendState();
      } else if (message.type === 'autonomous.startFlow') {
        await this.startFlow(message.flowId, message.launch);
      } else if (message.type === 'autonomous.startRun') {
        await this.startRun(message.runId, message.launch);
      } else if (message.type === 'autonomous.stopSession') {
        this.runningSessions.get(message.sessionId)?.abort();
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
    const workspaceRoot = getWorkspaceFolder().uri.fsPath;
    const definitions = await discoverAutonomousDefinitions({ workspaceRoot });
    const flow = definitions.flows.find((candidate) => candidate.id === flowId);
    if (!flow) {
      throw new Error(`Unknown autonomous flow: ${flowId}`);
    }

    const sessionId = createSessionId('flow');
    const abortController = new AbortController();
    this.runningSessions.set(sessionId, abortController);
    const sessionStore = new AutonomousSessionStore(workspaceRoot);
    const engineRegistry = this.createEngineRegistry();
    const workDir = launch.workDir || workspaceRoot;
    const running = runAutonomousFlow({
      flow,
      workspaceRoot,
      workDir,
      launch,
      sessionStore,
      engineRegistry,
      signal: abortController.signal,
      sessionId
    });

    void running.finally(() => {
      this.runningSessions.delete(sessionId);
      void this.sendState();
    });
    await this.sendState();
  }

  private async startRun(runId: string, launch: AutonomousLaunchOptions): Promise<void> {
    const workspaceRoot = getWorkspaceFolder().uri.fsPath;
    const definitions = await discoverAutonomousDefinitions({ workspaceRoot });
    const run = definitions.runs.find((candidate) => candidate.id === runId);
    if (!run) {
      throw new Error(`Unknown autonomous run: ${runId}`);
    }

    const sessionId = createSessionId('run');
    const abortController = new AbortController();
    this.runningSessions.set(sessionId, abortController);
    const sessionStore = new AutonomousSessionStore(workspaceRoot);
    const engineRegistry = this.createEngineRegistry();
    const running = runAutonomousBatch({
      run,
      definitions,
      workspaceRoot,
      launch,
      sessionStore,
      engineRegistry,
      signal: abortController.signal,
      sessionId
    });

    void running.finally(() => {
      this.runningSessions.delete(sessionId);
      void this.sendState();
    });
    await this.sendState();
  }

  private createEngineRegistry() {
    return createAutonomousEngineRegistry({ openRouterClient: this.openRouterClient, codexClient: this.codexClient });
  }

  private async revealSession(sessionId: string): Promise<void> {
    const sessionUri = vscode.Uri.file(
      new AutonomousSessionStore(getWorkspaceFolder().uri.fsPath).rootPath + `/${sessionId}`
    );
    await vscode.env.openExternal(sessionUri);
  }

  private async exportSession(sessionId: string, format: 'markdown' | 'json'): Promise<void> {
    const store = new AutonomousSessionStore(getWorkspaceFolder().uri.fsPath);
    const document = await vscode.workspace.openTextDocument({
      language: format === 'markdown' ? 'markdown' : 'json',
      content:
        format === 'markdown'
          ? await store.exportMarkdown(sessionId)
          : JSON.stringify(await store.readSession(sessionId), null, 2)
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

    const state = await buildAutonomousState({
      workspaceRoot: getWorkspaceFolder().uri.fsPath,
      workspaceName: getWorkspaceName(),
      openRouterClient: this.openRouterClient,
      codexClient: this.codexClient
    });
    await this.panel.webview.postMessage({ type: 'autonomous.state', state });
  }
}
