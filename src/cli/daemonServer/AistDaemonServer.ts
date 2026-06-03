import { randomUUID } from 'node:crypto';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { FileBackedConfigStore } from '../../core/app/config/config';
import { AgentRuntimeService } from '../../core/app/runtime/agentRuntime';
import { ChatRepository } from '../../core/entities/chat/chatRepository';
import { AgentMemoryStore, createMemoryStorePaths } from '../../core/entities/memory/memory';
import type { AuxiliaryModelInvoker } from '../../core/entities/model/auxiliaryModel';
import { RunRepository } from '../../core/entities/run/runRepository';
import { globalWorkspaceRoot } from '../../core/entities/storage/storage';
import { SubagentRepository } from '../../core/entities/subagent/subagentRepository';
import { DefaultToolRegistry, type ToolRegistry } from '../../core/features/tool-execution/toolRegistry';
import { AutonomousBackend } from '../../core/processes/autonomous';
import type { DaemonActiveRun, DaemonClientCapabilities } from '../daemonProtocol';
import { getDaemonSocketPath } from '../daemonProtocol';
import type { AistDaemonServerOptions } from './AistDaemonServerOptions';
import type { DaemonConnection } from './DaemonConnection';
import { DaemonFileLogger } from './DaemonFileLogger';
import type { PendingApproval } from './PendingApproval';
import { installAistDaemonServerMethods } from './installAistDaemonServerMethods';
import { IsolationSessionManager } from './isolation/IsolationSessionManager';

/**
 * Что это: локальный JSON-RPC daemon server AIST для workspace.
 * Зачем нужно: daemon держит socket, repositories, runtime, autonomous backend и состояние подключений.
 * Какую продуктовую проблему решает: VS Code webview и CLI получают единый backend агента без дублирования процессов.
 */
export class AistDaemonServer {
  readonly workspaceRoot: string;
  readonly homeDir: string;
  readonly socketPath: string;
  readonly logFilePath: string;

  readonly env: Record<string, string | undefined>;
  readonly now: () => number;
  readonly idFactory: () => string;
  readonly logger: DaemonFileLogger;
  readonly chatRepository: ChatRepository;
  readonly runRepository: RunRepository;
  readonly subagentRepository: SubagentRepository;
  readonly configStore: FileBackedConfigStore;
  readonly memoryStore: AgentMemoryStore;
  readonly toolRegistry: ToolRegistry;
  readonly runtime: AgentRuntimeService;
  readonly autonomousBackend: AutonomousBackend;
  readonly isolationSessions: IsolationSessionManager;
  readonly auxiliaryModel: AuxiliaryModelInvoker;
  readonly connections = new Set<DaemonConnection>();
  readonly pendingApprovalsById = new Map<string, PendingApproval>();
  readonly pendingApprovalsByMessageId = new Map<string, PendingApproval>();

  server: net.Server | undefined;
  readonly activeRunsById = new Map<string, DaemonActiveRun>();
  readonly activeRunsByChat = new Map<string, DaemonActiveRun>();
  readonly startingRunsByChat = new Set<string>();
  nextClientRequestId = 1;
  cachedToolPermissions: Record<string, import('../../core/shared/types/types').ToolPermissionMode> = {};

  constructor(readonly options: AistDaemonServerOptions) {
    this.workspaceRoot = path.resolve(options.workspaceRoot);
    this.homeDir = options.homeDir || os.homedir();
    this.env = options.env || process.env;
    this.now = options.now || Date.now;
    this.idFactory = options.idFactory || randomUUID;
    this.socketPath = options.socketPath || getDaemonSocketPath(this.workspaceRoot);
    this.logFilePath = path.join(globalWorkspaceRoot(this.workspaceRoot, this.homeDir), 'daemon.log');
    this.logger = new DaemonFileLogger(this.logFilePath);
    this.chatRepository = new ChatRepository({ workspaceRoot: this.workspaceRoot, homeDir: this.homeDir });
    this.runRepository = new RunRepository({ workspaceRoot: this.workspaceRoot, homeDir: this.homeDir });
    this.subagentRepository = new SubagentRepository({
      workspaceRoot: this.workspaceRoot,
      homeDir: this.homeDir,
      idFactory: this.idFactory,
      now: this.now
    });
    this.configStore = new FileBackedConfigStore({
      workspaceRoot: this.workspaceRoot,
      homeDir: this.homeDir,
      logger: this.logger
    });
    this.memoryStore = new AgentMemoryStore(
      createMemoryStorePaths({ workspaceRoot: this.workspaceRoot, homeDir: this.homeDir })
    );
    this.toolRegistry = options.toolRegistry || new DefaultToolRegistry();
    this.auxiliaryModel = this.createAuxiliaryModelInvoker();
    this.runtime = this.createRuntime();
    this.autonomousBackend = new AutonomousBackend({
      workspaceRoot: this.workspaceRoot,
      homeDir: this.homeDir,
      env: this.env,
      fetch: this.options.fetch,
      modelClient: this.options.modelClient,
      logger: this.logger,
      now: this.now,
      idFactory: this.idFactory
    });
    this.autonomousBackend.onEvent((event) => this.broadcastEvent(event));
    this.isolationSessions = new IsolationSessionManager({
      workspaceRoot: this.workspaceRoot,
      homeDir: this.homeDir,
      env: this.env,
      now: this.now,
      idFactory: this.idFactory,
      emit: (event) => this.broadcastEvent(event),
      runAgent: (input) => this.runIsolationAgent(input)
    });
  }
}

installAistDaemonServerMethods();

export type { AistDaemonServerOptions };
export type { DaemonClientCapabilities };
