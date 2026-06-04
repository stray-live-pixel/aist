import { runWebUiServer } from '../../ui/web/server/runWebUiServer';
import type { CliCommand } from './CliCommand';
import type { CliWriter } from './CliWriter';
import type { RunCliOptions } from './RunCliOptions';
import { resolveCommandWorkspaceRoot } from './resolveCommandWorkspaceRoot';

export async function runWebCommand(
  command: Extract<CliCommand, { kind: 'web' }>,
  options: RunCliOptions,
  stderr: CliWriter
): Promise<number> {
  const workspaceRoot = await resolveCommandWorkspaceRoot(command.workspace, options);
  return runWebUiServer({ command, workspaceRoot, options, stderr });
}
