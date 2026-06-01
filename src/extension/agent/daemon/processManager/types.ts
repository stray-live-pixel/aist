import { spawn } from 'node:child_process';
import * as vscode from 'vscode';

import type { DaemonJsonRpcClient } from '../../../../cli/daemonClient';
import type { AistLogger } from '../../../shared/logger';

/**
 * Что это: текущий статус локального daemon-процесса в VS Code.
 * Зачем нужно: UI и диагностика видят, подключаемся ли мы, стартуем daemon или получили ошибку.
 * Какую проблему решает: пользователь понимает причину недоступности агента без чтения логов.
 */
export type DaemonProcessStatus = {
  state: 'idle' | 'starting' | 'running' | 'error';
  socketPath: string;
  command?: string;
  args?: readonly string[];
  message?: string;
  restartCount: number;
};

/**
 * Что это: нормализованная команда запуска daemon.
 * Зачем нужно: manager одинаково запускает bundled cli, workspace bin и binary из PATH.
 * Какую проблему решает: логика spawn не знает, откуда найден исполняемый файл.
 */
export type DaemonCommand = {
  command: string;
  args: string[];
  displayPath: string;
};

/**
 * Что это: зависимости VS Code daemon process manager.
 * Зачем нужно: tests подменяют spawn, socket connect и filesystem lookup.
 * Какую проблему решает: запуск daemon проверяется без реального процесса и без зависимости от окружения.
 */
export type VscodeDaemonProcessManagerOptions = {
  context: vscode.ExtensionContext;
  workspaceRoot: string;
  logger: AistLogger;
  spawnProcess?: typeof spawn;
  connectClient?: (socketPath: string) => Promise<DaemonJsonRpcClient>;
  existsSync?: (filePath: string) => boolean;
  setTimeout?: typeof setTimeout;
};
