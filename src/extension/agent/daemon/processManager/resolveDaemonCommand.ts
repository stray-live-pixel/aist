import path from 'node:path';
import * as vscode from 'vscode';

import { findDaemonBinaryOnPath } from './findDaemonBinaryOnPath';
import { toDaemonCommand } from './toDaemonCommand';
import type { DaemonCommand } from './types';

/**
 * Что это: выбирает лучшую команду запуска AIST daemon для текущего workspace.
 * Зачем нужно: daemon может быть настроен вручную, поставлен вместе с extension или лежать в node_modules.
 * Какую проблему решает: lifecycle manager не содержит правил приоритета binary-кандидатов.
 */
export function resolveDaemonCommand({
  context,
  workspaceRoot,
  existsSync
}: {
  context: vscode.ExtensionContext;
  workspaceRoot: string;
  existsSync(filePath: string): boolean;
}): DaemonCommand {
  const configured = vscode.workspace.getConfiguration('openrouterAgent').get<string>('daemonBinaryPath')?.trim();
  const workspaceBin = path.join(
    workspaceRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'aist.cmd' : 'aist'
  );
  const bundledCli = path.join(context.extensionPath, 'dist', 'cli', 'main.js');
  const bundledBin = path.join(context.extensionPath, process.platform === 'win32' ? 'aist.cmd' : 'aist');
  const pathBin = findDaemonBinaryOnPath({ binaryName: 'aist', existsSync });
  const candidate = [configured, bundledBin, workspaceBin, pathBin].find((item): item is string =>
    Boolean(item && existsSync(item))
  );

  if (candidate) {
    return toDaemonCommand({ candidate, workspaceRoot });
  }

  if (existsSync(bundledCli)) {
    return {
      command: process.execPath,
      args: [bundledCli, 'daemon', '--workspace', workspaceRoot],
      displayPath: bundledCli
    };
  }

  return {
    command: 'aist',
    args: ['daemon', '--workspace', workspaceRoot],
    displayPath: 'aist'
  };
}
