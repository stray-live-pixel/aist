import { spawn } from 'node:child_process';
import path from 'node:path';

import type { ChatVcsState } from '../../../core/shared/types/types';

export type ChatVcsService = {
  getCurrentState(): Promise<ChatVcsState | undefined>;
  createIsolatedBranch(chatId: string): Promise<ChatVcsState>;
  commitAndForcePush(message: string): Promise<ChatVcsState>;
};

export type ChatVcsServiceOptions = {
  workspaceRoot: string;
  command?: string | (() => string);
  mainBranch?: string;
};

type SpawnResult = { exitCode: number | null; stdout: string; stderr: string };

const DEFAULT_COMMAND = 'git';
const DEFAULT_MAIN_BRANCH = 'main';

/**
 * Что это: VCS-сервис чата для git-like команд.
 * Зачем нужно: Composer показывает ветку и запускает isolated/commit/merge сценарии из одного backend API.
 * Какую продуктовую проблему решает: проекты на git, arc или совместимой VCS управляются одинаково, а проекты без VCS не пугают ошибкой refresh.
 */
export function createChatVcsService(options: ChatVcsServiceOptions): ChatVcsService {
  const workspaceRoot = options.workspaceRoot;
  const mainBranch = options.mainBranch || DEFAULT_MAIN_BRANCH;

  return {
    async getCurrentState(): Promise<ChatVcsState | undefined> {
      const command = resolveCommand({ command: options.command });
      const branch = await getCurrentBranch({ command, cwd: workspaceRoot, missingRepository: 'ignore' });
      return branch ? { command, branch, baseBranch: mainBranch, isolated: branch.startsWith('aist/') } : undefined;
    },

    async createIsolatedBranch(chatId: string): Promise<ChatVcsState> {
      const command = resolveCommand({ command: options.command });
      const currentBranch = await getCurrentBranch({ command, cwd: workspaceRoot, missingRepository: 'throw' });
      const branch = `aist/chat-${safeBranchPart({ value: chatId })}-${Date.now().toString(36)}`;
      await runVcs({ command, args: ['checkout', '-b', branch], cwd: workspaceRoot });
      return { command, branch, baseBranch: currentBranch || mainBranch, isolated: true };
    },

    async commitAndForcePush(message: string): Promise<ChatVcsState> {
      const command = resolveCommand({ command: options.command });
      const branch = await getCurrentBranch({ command, cwd: workspaceRoot, missingRepository: 'throw' });
      await runVcs({ command, args: ['add', '-A'], cwd: workspaceRoot });
      const status = await runVcs({ command, args: ['status', '--porcelain'], cwd: workspaceRoot });
      if (status.trim()) {
        await runVcs({ command, args: ['commit', '-m', message], cwd: workspaceRoot });
      }
      await runVcs({ command, args: ['push', '-f', 'origin', branch], cwd: workspaceRoot });
      return { command, branch, baseBranch: mainBranch, isolated: branch.startsWith('aist/') };
    }
  };
}

export function buildMergeToMainPrompt(vcs: ChatVcsState | undefined): string {
  const branch = vcs?.branch || '<current branch>';
  const mainBranch = vcs?.baseBranch || DEFAULT_MAIN_BRANCH;
  const command = vcs?.command || DEFAULT_COMMAND;
  return [
    `Нужно слить текущую агентскую ветку ${branch} в основную ветку ${mainBranch}.`,
    `Используй ${command}-like команды из workspace.`,
    'Сначала изучи статус репозитория и актуализируй основную ветку.',
    'Затем выполни merge текущих изменений в основную ветку.',
    'Если возникнут конфликты, разреши их как агент: изучи конфликтующие файлы, внеси правки, проверь результат и сделай commit merge.',
    'Не делай push без отдельного явного указания пользователя.'
  ].join('\n');
}

async function getCurrentBranch({
  command,
  cwd,
  missingRepository
}: {
  command: string;
  cwd: string;
  missingRepository: 'ignore' | 'throw';
}): Promise<string> {
  const result = await spawnCollect({ command, args: ['branch', '--show-current'], cwd });
  if (missingRepository === 'ignore' && isMissingRepository({ result })) {
    return '';
  }
  assertVcsSuccess({ command, args: ['branch', '--show-current'], cwd, result });
  return result.stdout.trim() || 'HEAD';
}

function resolveCommand({ command }: { command: ChatVcsServiceOptions['command'] }): string {
  const value = typeof command === 'function' ? command() : command;
  return value?.trim() || DEFAULT_COMMAND;
}

function safeBranchPart({ value }: { value: string }): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

async function runVcs({
  command,
  args,
  cwd
}: {
  command: string;
  args: readonly string[];
  cwd: string;
}): Promise<string> {
  const result = await spawnCollect({ command, args, cwd });
  assertVcsSuccess({ command, args, cwd, result });
  return result.stdout;
}

function assertVcsSuccess({
  command,
  args,
  cwd,
  result
}: {
  command: string;
  args: readonly string[];
  cwd: string;
  result: SpawnResult;
}): void {
  if (result.exitCode === 0) {
    return;
  }

  const commandLine = [command, ...args].join(' ');
  const details = result.stderr.trim() || result.stdout.trim() || `exit code ${result.exitCode}`;
  throw new Error(`${commandLine} failed in ${path.basename(cwd)}: ${details}`);
}

function isMissingRepository({ result }: { result: SpawnResult }): boolean {
  const details = `${result.stderr}\n${result.stdout}`.toLowerCase();
  return details.includes('not a git repository') || details.includes('not a repository');
}

async function spawnCollect({
  command,
  args,
  cwd
}: {
  command: string;
  args: readonly string[];
  cwd: string;
}): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (exitCode) => {
      resolve({
        exitCode,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8')
      });
    });
  });
}
