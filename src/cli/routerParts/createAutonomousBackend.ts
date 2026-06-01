import path from 'node:path';

import { AutonomousBackend } from '../../core/processes/autonomous';
import { RunCliOptions } from './RunCliOptions';
import { getCliEnv } from './getCliEnv';
import { resolveCommandWorkspaceRoot } from './resolveCommandWorkspaceRoot';
import { silentLogger } from './silentLogger';

export async function createAutonomousBackend(
  workspace: string | undefined,
  options: RunCliOptions
): Promise<AutonomousBackend> {
  const workspaceRoot = await resolveCommandWorkspaceRoot(workspace, options);
  return new AutonomousBackend({
    workspaceRoot,
    workspaceName: path.basename(workspaceRoot),
    homeDir: options.homeDir,
    env: getCliEnv(options),
    fetch: options.fetch,
    modelClient: options.modelClient,
    logger: silentLogger
  });
}
