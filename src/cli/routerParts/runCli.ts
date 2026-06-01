import { createCliCommandRunner } from '../commands/cliCommandRunner';
import { CLI_NAME } from './CLI_NAME';
import { CLI_VERSION } from './CLI_VERSION';
import { CliCommandError } from './CliCommandError';
import { CliUsageError } from './CliUsageError';
import { RunCliOptions } from './RunCliOptions';
import { formatCliErrorJson } from './formatCliErrorJson';
import { formatDoctorOutput } from './formatDoctorOutput';
import { formatHelpOutput } from './formatHelpOutput';
import { formatPathsOutput } from './formatPathsOutput';
import { parseCliArgs } from './parseCliArgs';
import { resolveCliPaths } from './resolveCliPaths';
import { runAuthCommand } from './runAuthCommand';
import { runAutonomousCommand } from './runAutonomousCommand';
import { runChatCommand } from './runChatCommand';
import { runConfigCommand } from './runConfigCommand';
import { runDaemonCommand } from './runDaemonCommand';
import { runDoctor } from './runDoctor';
import { runModelsCommand } from './runModelsCommand';

export async function runCli(args: readonly string[], options: RunCliOptions = {}): Promise<number> {
  const stdout = options.stdout || ((text: string) => process.stdout.write(text));
  const stderr = options.stderr || ((text: string) => process.stderr.write(text));
  const wantsJson = args.includes('--json') || args.includes('--jsonl');

  try {
    const command = parseCliArgs(args);
    const runParsedCliCommand = createCliCommandRunner({
      handlers: {
        help: formatHelpOutput,
        version: () => CLI_VERSION,
        paths: (command) => formatPathsOutput(resolveCliPaths({ ...options, workspace: command.workspace })),
        doctor: async (command, stderr) => {
          const result = await runDoctor({ ...options, workspace: command.workspace });
          if (!result.ok) {
            stderr(`${CLI_NAME} doctor failed: one or more checks failed.\n`);
          }

          return { exitCode: result.ok ? 0 : 1, output: formatDoctorOutput(result) };
        },
        daemon: (command, stderr) => runDaemonCommand(command, options, stderr),
        chat: (command, stdout, stderr) => runChatCommand(command, options, stdout, stderr),
        config: (command, stdout) => runConfigCommand(command, options, stdout),
        auth: (command, stdout, stderr) => runAuthCommand(command, options, stdout, stderr),
        models: (command, stdout) => runModelsCommand(command, options, stdout),
        autonomous: (command, stdout) => runAutonomousCommand(command, options, stdout)
      }
    });

    return await runParsedCliCommand({ command, options, stdout, stderr });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const exitCode = error instanceof CliUsageError || error instanceof CliCommandError ? error.exitCode : 1;
    if (wantsJson) {
      stderr(formatCliErrorJson(error, message));
    } else {
      stderr(`${CLI_NAME}: ${message}\n`);
    }

    if (error instanceof CliUsageError) {
      if (!wantsJson) {
        stderr(`Run '${CLI_NAME} --help' for usage.\n`);
      }
    }

    return exitCode;
  }
}
