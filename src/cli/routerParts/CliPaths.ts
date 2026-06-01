import {
  globalAistRoot,
  globalMemoryFile,
  globalSettingsFile,
  globalToolsDir,
  workspaceAistRoot,
  workspaceSettingsFile,
  workspaceToolsDir
} from '../../core/entities/storage/storage';

export type CliPaths = {
  readonly workspaceRoot: string;
  readonly workspaceAistRoot: string;
  readonly workspaceSettingsFile: string;
  readonly workspaceChatsDir: string;
  readonly workspaceRunsDir: string;
  readonly workspaceTelemetryDir: string;
  readonly workspaceToolsDir: string;
  readonly globalAistRoot: string;
  readonly globalSettingsFile: string;
  readonly globalMemoryFile: string;
  readonly globalToolsDir: string;
};
