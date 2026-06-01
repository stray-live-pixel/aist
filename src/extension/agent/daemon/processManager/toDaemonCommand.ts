import type { DaemonCommand } from './types';

/**
 * Что это: превращает найденный файл CLI в команду запуска daemon.
 * Зачем нужно: .js запускается через текущий node, а binary/cmd запускается напрямую.
 * Какую проблему решает: spawn получает единый формат команды независимо от типа файла.
 */
export function toDaemonCommand({
  candidate,
  workspaceRoot
}: {
  candidate: string;
  workspaceRoot: string;
}): DaemonCommand {
  if (candidate.endsWith('.js')) {
    return {
      command: process.execPath,
      args: [candidate, 'daemon', '--workspace', workspaceRoot],
      displayPath: candidate
    };
  }

  return {
    command: candidate,
    args: ['daemon', '--workspace', workspaceRoot],
    displayPath: candidate
  };
}
