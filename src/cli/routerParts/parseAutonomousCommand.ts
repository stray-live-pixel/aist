import { CliCommand } from './CliCommand';
import { CliUsageError } from './CliUsageError';
import { assertNoExtraArgs } from './assertNoExtraArgs';
import { parseAutonomousExportOptions } from './parseAutonomousExportOptions';
import { parseAutonomousSessionOptions } from './parseAutonomousSessionOptions';
import { parseAutonomousStartOptions } from './parseAutonomousStartOptions';
import { parseChatWorkspaceJsonOptions } from './parseChatWorkspaceJsonOptions';

export function parseAutonomousCommand(args: readonly string[]): CliCommand {
  const [subcommand, ...rest] = args;
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    assertNoExtraArgs(rest, subcommand || 'autonomous');
    return { kind: 'help' };
  }

  if (subcommand === 'list') {
    const options = parseChatWorkspaceJsonOptions('autonomous list', rest);
    if (options.showHelp) {
      return { kind: 'help' };
    }
    return { kind: 'autonomousList', workspace: options.workspace, json: options.json };
  }

  if (subcommand === 'flow') {
    const [flowCommand, ...flowRest] = rest;
    if (flowCommand === 'start') {
      const options = parseAutonomousStartOptions('autonomous flow start', flowRest, 'flow');
      if (options.showHelp) {
        return { kind: 'help' };
      }
      return {
        kind: 'autonomousFlowStart',
        flowId: options.targetId,
        workspace: options.workspace,
        launch: options.launch,
        jsonl: options.jsonl
      };
    }
    if (!flowCommand || flowCommand === '--help' || flowCommand === '-h') {
      assertNoExtraArgs(flowRest, flowCommand || 'autonomous flow');
      return { kind: 'help' };
    }
    throw new CliUsageError(`Unknown autonomous flow command: ${flowCommand}`);
  }

  if (subcommand === 'run') {
    const [runCommand, ...runRest] = rest;
    if (runCommand === 'start') {
      const options = parseAutonomousStartOptions('autonomous run start', runRest, 'run');
      if (options.showHelp) {
        return { kind: 'help' };
      }
      return {
        kind: 'autonomousRunStart',
        runId: options.targetId,
        workspace: options.workspace,
        launch: options.launch,
        jsonl: options.jsonl
      };
    }
    if (!runCommand || runCommand === '--help' || runCommand === '-h') {
      assertNoExtraArgs(runRest, runCommand || 'autonomous run');
      return { kind: 'help' };
    }
    throw new CliUsageError(`Unknown autonomous run command: ${runCommand}`);
  }

  if (subcommand === 'stop') {
    const options = parseAutonomousSessionOptions('autonomous stop', rest);
    if (options.showHelp) {
      return { kind: 'help' };
    }
    return { kind: 'autonomousStop', sessionId: options.sessionId, workspace: options.workspace, json: options.json };
  }

  if (subcommand === 'export') {
    const options = parseAutonomousExportOptions(rest);
    if (options.showHelp) {
      return { kind: 'help' };
    }
    return {
      kind: 'autonomousExport',
      sessionId: options.sessionId,
      workspace: options.workspace,
      format: options.format
    };
  }

  if (subcommand.startsWith('-')) {
    throw new CliUsageError(`Unknown option for 'autonomous': ${subcommand}`);
  }

  throw new CliUsageError(`Unknown autonomous command: ${subcommand}`);
}
