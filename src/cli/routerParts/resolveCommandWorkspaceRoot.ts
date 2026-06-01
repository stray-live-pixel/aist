import fs from 'node:fs';
import path from 'node:path';

import { CliCommandError } from './CliCommandError';
import { RunCliOptions } from './RunCliOptions';
import { resolveCliPaths } from './resolveCliPaths';

export async function resolveCommandWorkspaceRoot(
  workspace: string | undefined,
  options: RunCliOptions
): Promise<string> {
  const paths = resolveCliPaths({ ...options, workspace });

  try {
    const stat = await fs.promises.stat(paths.workspaceRoot);
    if (!stat.isDirectory()) {
      throw new CliCommandError('workspace.invalid', `Workspace path is not a directory: ${paths.workspaceRoot}`, {
        details: { workspaceRoot: paths.workspaceRoot }
      });
    }

    return paths.workspaceRoot;
  } catch (error) {
    if (error instanceof CliCommandError) {
      throw error;
    }

    throw new CliCommandError('workspace.invalid', `Workspace path is not accessible: ${paths.workspaceRoot}`, {
      details: { workspaceRoot: paths.workspaceRoot }
    });
  }
}
