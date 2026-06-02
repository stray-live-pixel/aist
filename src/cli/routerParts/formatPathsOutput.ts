import { CliPaths } from './CliPaths';

export function formatPathsOutput(paths: CliPaths): string {
  return `AIST paths
Workspace root: ${paths.workspaceRoot}
Workspace AIST root: ${paths.workspaceAistRoot}
Workspace settings: ${paths.workspaceSettingsFile}
Personal chats: ${paths.workspaceChatsDir}
Personal runs: ${paths.workspaceRunsDir}
Personal telemetry: ${paths.workspaceTelemetryDir}
Workspace tools: ${paths.workspaceToolsDir}
Global AIST root: ${paths.globalAistRoot}
Global settings: ${paths.globalSettingsFile}
Global memory: ${paths.globalMemoryFile}
Global tools: ${paths.globalToolsDir}
`;
}
