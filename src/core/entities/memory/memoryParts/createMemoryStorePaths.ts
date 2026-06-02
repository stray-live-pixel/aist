import { globalMemoryFile, workspaceMemoryEventsFile, workspaceMemoryFile } from '../../storage/storage';
import { AgentMemoryStorePaths } from './AgentMemoryStorePaths';

export function createMemoryStorePaths(options: { workspaceRoot: string; homeDir?: string }): AgentMemoryStorePaths {
  return {
    globalPath: globalMemoryFile(options.homeDir),
    projectPath: workspaceMemoryFile(options.workspaceRoot),
    eventsPath: workspaceMemoryEventsFile(options.workspaceRoot)
  };
}
