import { RunCliOptions } from './RunCliOptions';
import { resolveCommandWorkspaceRoot } from './resolveCommandWorkspaceRoot';

export async function resolveChatWorkspaceRoot(workspace: string | undefined, options: RunCliOptions): Promise<string> {
  return resolveCommandWorkspaceRoot(workspace, options);
}
