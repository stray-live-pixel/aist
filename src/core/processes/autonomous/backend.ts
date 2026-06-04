import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { FileBackedConfigStore, FileSecretStore } from '../../app/config/config';
import type { AutonomousBackendContext } from './backend/AutonomousBackendContext';
import type { AutonomousBackendEvent } from './backend/AutonomousBackendEvent';
import type { AutonomousBackendOptions } from './backend/AutonomousBackendOptions';
import type { AutonomousExportFormat } from './backend/AutonomousExportFormat';
import type { AutonomousExportResult } from './backend/AutonomousExportResult';
import type { AutonomousStartResult } from './backend/AutonomousStartResult';
import type { AutonomousStopResult } from './backend/AutonomousStopResult';
import { createBackendEngineRegistry } from './backend/createBackendEngineRegistry';
import { disposeAutonomousBackend } from './backend/disposeAutonomousBackend';
import { emitAutonomousEvent } from './backend/emitAutonomousEvent';
import { emitAutonomousStateChanged } from './backend/emitAutonomousStateChanged';
import { exportAutonomousSession } from './backend/exportAutonomousSession';
import { noopLogger } from './backend/noopLogger';
import { startAutonomousFlow } from './backend/startAutonomousFlow';
import { startAutonomousRun } from './backend/startAutonomousRun';
import { stopAutonomousSession } from './backend/stopAutonomousSession';
import { waitForAutonomousSession } from './backend/waitForAutonomousSession';
import { importLegacyDefinitions } from './discovery';
import {
  type CreateAutonomousFlowInput,
  type DeleteAutonomousFlowInput,
  type EditableAutonomousFlowDefinition,
  createAutonomousFlowDefinition,
  deleteAutonomousFlowDefinition,
  saveAutonomousFlowDefinition
} from './flowDefinitionWriter';
import { buildAutonomousState } from './presenter';
import { AutonomousSessionStore } from './storage/sessionStore';
import type { AutonomousLaunchOptions, AutonomousSessionView, AutonomousState } from './types';

export type { AutonomousBackendEvent } from './backend/AutonomousBackendEvent';
export type { AutonomousBackendLogger } from './backend/AutonomousBackendLogger';
export type { AutonomousBackendOptions } from './backend/AutonomousBackendOptions';
export type { AutonomousExportFormat } from './backend/AutonomousExportFormat';
export type { AutonomousExportResult } from './backend/AutonomousExportResult';
export type { AutonomousStartResult } from './backend/AutonomousStartResult';
export type { AutonomousStopResult } from './backend/AutonomousStopResult';

/**
 * Что это: backend-оркестратор автономных flow/run сценариев для workspace.
 * Зачем нужно: публичный класс сохраняет API, а запуск, events и model clients вынесены в маленькие сценарии.
 * Какую продуктовую проблему решает: автономный режим остаётся расширяемым без монолитного backend.ts.
 */
export class AutonomousBackend {
  readonly workspaceRoot: string;
  readonly workspaceName: string;
  readonly sessionStore: AutonomousSessionStore;

  private readonly context: AutonomousBackendContext;

  /** Создаёт backend для конкретного workspace и связывает sessionStore events с подписчиками. */
  constructor(options: AutonomousBackendOptions) {
    this.workspaceRoot = path.resolve(options.workspaceRoot);
    this.workspaceName = options.workspaceName || path.basename(this.workspaceRoot);
    const logger = options.logger || noopLogger;
    const context = this.createContext({ ...options, logger });

    this.context = context;
    this.sessionStore = context.sessionStore;
  }

  /** Подписывает клиента на события автономного backend. */
  onEvent(listener: (event: AutonomousBackendEvent) => void): () => void {
    this.context.listeners.add(listener);
    return () => this.context.listeners.delete(listener);
  }

  /** Возвращает актуальный autonomous state workspace. */
  async getState(): Promise<AutonomousState> {
    return buildAutonomousState({
      workspaceRoot: this.workspaceRoot,
      workspaceName: this.workspaceName,
      homeDir: this.context.homeDir,
      engineRegistry: this.context.createEngineRegistry()
    });
  }

  /** Импортирует legacy definitions и уведомляет клиентов об изменении state. */
  async importLegacyDefinitions(): Promise<AutonomousState> {
    await importLegacyDefinitions(this.workspaceRoot);
    emitAutonomousStateChanged({ context: this.context, reason: 'autonomous.importLegacy' });
    return this.getState();
  }

  /** Создаёт editable flow definition. */
  async createFlow(input: CreateAutonomousFlowInput): Promise<EditableAutonomousFlowDefinition> {
    const flow = await createAutonomousFlowDefinition(this.workspaceRoot, input);
    emitAutonomousStateChanged({ context: this.context, reason: 'autonomous.createFlow' });
    return flow;
  }

  /** Сохраняет editable flow definition. */
  async saveFlow(flow: EditableAutonomousFlowDefinition): Promise<void> {
    await saveAutonomousFlowDefinition(this.workspaceRoot, flow);
    emitAutonomousStateChanged({ context: this.context, reason: 'autonomous.saveFlow' });
  }

  /** Удаляет flow definition. */
  async deleteFlow(input: string | DeleteAutonomousFlowInput): Promise<void> {
    await deleteAutonomousFlowDefinition(this.workspaceRoot, input);
    emitAutonomousStateChanged({ context: this.context, reason: 'autonomous.deleteFlow' });
  }

  /** Запускает flow definition. */
  startFlow(flowId: string, launch: AutonomousLaunchOptions): Promise<AutonomousStartResult> {
    return startAutonomousFlow({ context: this.context, flowId, launch });
  }

  /** Запускает run definition. */
  startRun(runId: string, launch: AutonomousLaunchOptions): Promise<AutonomousStartResult> {
    return startAutonomousRun({ context: this.context, runId, launch });
  }

  /** Останавливает активную session. */
  stop(sessionId: string): AutonomousStopResult {
    return stopAutonomousSession({ context: this.context, sessionId });
  }

  /** Ожидает активную session или читает завершённую. */
  waitForSession(sessionId: string): Promise<AutonomousSessionView> {
    return waitForAutonomousSession({ context: this.context, sessionId });
  }

  /** Экспортирует session в markdown или JSON. */
  exportSession(sessionId: string, format?: AutonomousExportFormat): Promise<AutonomousExportResult> {
    return exportAutonomousSession({ context: this.context, sessionId, format });
  }

  /** Освобождает listeners и отменяет активные sessions. */
  dispose(): void {
    disposeAutonomousBackend({ context: this.context });
  }

  /** Создаёт общий mutable-context для вынесенных сценариев. */
  private createContext(options: AutonomousBackendOptions): AutonomousBackendContext {
    const context = {
      workspaceRoot: this.workspaceRoot,
      workspaceName: this.workspaceName,
      homeDir: options.homeDir,
      env: options.env || {},
      fetch: options.fetch,
      modelClient: options.modelClient,
      logger: options.logger || noopLogger,
      now: options.now || Date.now,
      idFactory: options.idFactory || randomUUID,
      configStore: new FileBackedConfigStore({
        workspaceRoot: this.workspaceRoot,
        homeDir: options.homeDir,
        logger: options.logger || noopLogger
      }),
      secretStore: new FileSecretStore({ homeDir: options.homeDir, logger: options.logger || noopLogger }),
      sessionStore: undefined as unknown as AutonomousSessionStore,
      listeners: new Set<(event: AutonomousBackendEvent) => void>(),
      runningSessions: new Map<string, AbortController>(),
      completions: new Map<string, Promise<AutonomousSessionView>>(),
      createEngineRegistry: undefined as unknown as AutonomousBackendContext['createEngineRegistry']
    } satisfies AutonomousBackendContext;

    context.sessionStore = new AutonomousSessionStore(this.workspaceRoot, {
      homeDir: options.homeDir,
      onEvent: (sessionId, event) => {
        emitAutonomousEvent({
          context,
          event: { type: 'autonomous.event', workspaceRoot: this.workspaceRoot, sessionId, event }
        });
      }
    });
    context.createEngineRegistry = () => createBackendEngineRegistry({ context });
    return context;
  }
}
