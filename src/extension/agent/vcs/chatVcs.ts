import { spawn } from 'node:child_process';
import path from 'node:path';

import type { ChatVcsState } from '../../../core/shared/types/types';

export type ChatVcsService = {
  getCurrentState(): Promise<ChatVcsState>;
  createIsolatedBranch(chatId: string): Promise<ChatVcsState>;
  commitAndForcePush(message: string): Promise<ChatVcsState>;
};

export type ChatVcsServiceOptions = {
  workspaceRoot: string;
  command?: string;
  mainBranch?: string;
};

const DEFAULT_COMMAND = 'git';
const DEFAULT_MAIN_BRANCH = 'main';

export function createChatVcsService(options: ChatVcsServiceOptions): ChatVcsService {
  const command = options.command || DEFAULT_COMMAND;
  const workspaceRoot = options.workspaceRoot;
  const mainBranch = options.mainBranch || DEFAULT_MAIN_BRANCH;

  return {
    async getCurrentState(): Promise<ChatVcsState> {
      const branch = await getCurrentBranch(command, workspaceRoot);
      return { command, branch, baseBranch: mainBranch, isolated: branch.startsWith('aist/') };
    },

    async createIsolatedBranch(chatId: string): Promise<ChatVcsState> {
      const currentBranch = await getCurrentBranch(command, workspaceRoot);
      const branch = `aist/chat-${safeBranchPart(chatId)}-${Date.now().toString(36)}`;
      await runVcs(command, ['checkout', '-b', branch], workspaceRoot);
      return { command, branch, baseBranch: currentBranch || mainBranch, isolated: true };
    },

    async commitAndForcePush(message: string): Promise<ChatVcsState> {
      const branch = await getCurrentBranch(command, workspaceRoot);
      await runVcs(command, ['add', '-A'], workspaceRoot);
      const status = await runVcs(command, ['status', '--porcelain'], workspaceRoot);
      if (status.trim()) {
        await runVcs(command, ['commit', '-m', message], workspaceRoot);
      }
      await runVcs(command, ['push', '-f', 'origin', branch], workspaceRoot);
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

async function getCurrentBranch(command: string, cwd: string): Promise<string> {
  const branch = await runVcs(command, ['branch', '--show-current'], cwd);
  return branch.trim() || 'HEAD';
}

function safeBranchPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

async function runVcs(command: string, args: readonly string[], cwd: string): Promise<string> {
  const result = await spawnCollect(command, args, cwd);
  if (result.exitCode !== 0) {
    const commandLine = [command, ...args].join(' ');
    const details = result.stderr.trim() || result.stdout.trim() || `exit code ${result.exitCode}`;
    throw new Error(`${commandLine} failed in ${path.basename(cwd)}: ${details}`);
  }
  return result.stdout;
}

async function spawnCollect(
  command: string,
  args: readonly string[],
  cwd: string
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
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
