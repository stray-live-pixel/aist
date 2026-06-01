import {
  type AutonomousEngineId,
  type AutonomousLaunchOptions,
  type AutonomousVcsIsolationOptions
} from '../../core/processes/autonomous';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseAutonomousEngineOptionToken } from './parseAutonomousEngineOptionToken';
import { parseStringOptionToken } from './parseStringOptionToken';
import { parseWorkspaceOptionToken } from './parseWorkspaceOptionToken';

export function parseAutonomousStartOptions(
  command: string,
  args: readonly string[],
  targetLabel: 'flow' | 'run'
): {
  readonly targetId: string;
  readonly workspace?: string;
  readonly launch: AutonomousLaunchOptions;
  readonly jsonl: boolean;
  readonly showHelp: boolean;
} {
  let targetId: string | undefined;
  let workspace: string | undefined;
  let engineId: AutonomousEngineId = 'dry-run';
  let dryRun = true;
  let jsonl = false;
  let workDir: string | undefined;
  let extraPrompt: string | undefined;
  let vcsIsolation: AutonomousVcsIsolationOptions | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === '--help' || token === '-h') {
      assertNoExtraArgs(args.slice(index + 1), token);
      return {
        targetId: '',
        workspace,
        launch: { engineId, dryRun, workDir, vcsIsolation, extraPrompt },
        jsonl,
        showHelp: true
      };
    }

    if (token === '--jsonl') {
      jsonl = true;
      continue;
    }

    if (token === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (token === '--no-dry-run') {
      dryRun = false;
      continue;
    }

    const workspaceResult = parseWorkspaceOptionToken(command, args, index, workspace);
    if (workspaceResult.matched) {
      workspace = workspaceResult.workspace;
      index = workspaceResult.index;
      continue;
    }

    const engineResult = parseAutonomousEngineOptionToken(command, args, index, engineId);
    if (engineResult.matched) {
      engineId = engineResult.engineId;
      index = engineResult.index;
      continue;
    }

    const workDirResult = parseStringOptionToken(command, '--workdir', args, index, workDir);
    if (workDirResult.matched) {
      workDir = workDirResult.value;
      index = workDirResult.index;
      continue;
    }

    if (token === '--isolated') {
      vcsIsolation = { ...(vcsIsolation || { enabled: true }), enabled: true };
      continue;
    }

    if (token === '--keep-worktree') {
      vcsIsolation = { ...(vcsIsolation || { enabled: true }), enabled: true, keepWorktree: true };
      continue;
    }

    const vcsCommandResult = parseStringOptionToken(command, '--vcs-command', args, index, vcsIsolation?.command);
    if (vcsCommandResult.matched) {
      vcsIsolation = { ...(vcsIsolation || { enabled: true }), enabled: true, command: vcsCommandResult.value };
      index = vcsCommandResult.index;
      continue;
    }

    const vcsBaseBranchResult = parseStringOptionToken(
      command,
      '--vcs-base-branch',
      args,
      index,
      vcsIsolation?.baseBranch
    );
    if (vcsBaseBranchResult.matched) {
      vcsIsolation = { ...(vcsIsolation || { enabled: true }), enabled: true, baseBranch: vcsBaseBranchResult.value };
      index = vcsBaseBranchResult.index;
      continue;
    }

    const vcsBranchResult = parseStringOptionToken(command, '--vcs-branch', args, index, vcsIsolation?.branchName);
    if (vcsBranchResult.matched) {
      vcsIsolation = { ...(vcsIsolation || { enabled: true }), enabled: true, branchName: vcsBranchResult.value };
      index = vcsBranchResult.index;
      continue;
    }

    const vcsWorktreeResult = parseStringOptionToken(
      command,
      '--vcs-worktree',
      args,
      index,
      vcsIsolation?.worktreePath
    );
    if (vcsWorktreeResult.matched) {
      vcsIsolation = { ...(vcsIsolation || { enabled: true }), enabled: true, worktreePath: vcsWorktreeResult.value };
      index = vcsWorktreeResult.index;
      continue;
    }

    const extraPromptResult = parseStringOptionToken(command, '--extra-prompt', args, index, extraPrompt);
    if (extraPromptResult.matched) {
      extraPrompt = extraPromptResult.value;
      index = extraPromptResult.index;
      continue;
    }

    if (token.startsWith('-')) {
      throw new CliUsageError(`Unknown option for '${command}': ${token}`);
    }

    if (targetId !== undefined) {
      throw new CliUsageError(`Unexpected argument for '${command}': ${token}`);
    }
    targetId = token;
  }

  if (!targetId) {
    throw new CliUsageError(`'${command}' requires a ${targetLabel} id.`);
  }

  if (!jsonl) {
    throw new CliUsageError(`'${command}' currently requires --jsonl.`);
  }

  return {
    targetId,
    workspace,
    launch: { engineId, dryRun, workDir, vcsIsolation, extraPrompt },
    jsonl,
    showHelp: false
  };
}
