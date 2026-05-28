import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { AutonomousVcsEnvironment, AutonomousVcsIsolationOptions } from './types';

export type PrepareAutonomousVcsIsolationOptions = {
  workspaceRoot: string;
  sessionId: string;
  targetId: string;
  isolation?: AutonomousVcsIsolationOptions;
};

export type PreparedAutonomousVcsIsolation = {
  environment?: AutonomousVcsEnvironment;
  worktreeRoot?: string;
  dispose: () => Promise<void>;
};

const DEFAULT_COMMAND = 'git';

export async function prepareAutonomousVcsIsolation(
  options: PrepareAutonomousVcsIsolationOptions
): Promise<PreparedAutonomousVcsIsolation> {
  if (!options.isolation?.enabled) {
    return { dispose: async () => {} };
  }

  const command = options.isolation.command || DEFAULT_COMMAND;
  const baseBranch =
    options.isolation.baseBranch || (await runVcs(command, ['branch', '--show-current'], options.workspaceRoot));
  if (!baseBranch.trim()) {
    throw new Error(`Cannot determine current branch with ${command}. Provide --vcs-base-branch explicitly.`);
  }

  const branchName = options.isolation.branchName || createBranchName(options.targetId, options.sessionId);
  const worktreePath = path.resolve(
    options.workspaceRoot,
    options.isolation.worktreePath || path.join('..', `${path.basename(options.workspaceRoot)}-${branchName}`)
  );
  const keepWorktree = Boolean(options.isolation.keepWorktree);

  await fs.mkdir(path.dirname(worktreePath), { recursive: true });
  await runVcs(command, ['worktree', 'add', '-b', branchName, worktreePath, baseBranch.trim()], options.workspaceRoot);

  const environment: AutonomousVcsEnvironment = {
    command,
    baseBranch: baseBranch.trim(),
    branchName,
    worktreePath,
    keepWorktree
  };

  return {
    environment,
    worktreeRoot: worktreePath,
    dispose: async () => {
      if (keepWorktree) {
        return;
      }

      await runVcs(command, ['worktree', 'remove', '--force', worktreePath], options.workspaceRoot);
    }
  };
}

function createBranchName(targetId: string, sessionId: string): string {
  const safeTarget = targetId
    .toLowerCase()
    .replace(/[^a-z0-9._/-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const safeSession = sessionId.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-24);
  return `aist/${safeTarget || 'task'}-${safeSession}`;
}

async function runVcs(command: string, args: readonly string[], cwd: string): Promise<string> {
  const result = await spawnCollect(command, args, cwd);
  if (result.exitCode !== 0) {
    const commandLine = [command, ...args].join(' ');
    const details = result.stderr.trim() || result.stdout.trim() || `exit code ${result.exitCode}`;
    throw new Error(`${commandLine} failed: ${details}`);
  }
  return result.stdout.trim();
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
