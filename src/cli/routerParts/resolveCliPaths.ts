import os from 'node:os';
import path from 'node:path';

import {
  globalAistRoot,
  globalMemoryFile,
  globalSettingsFile,
  globalToolsDir,
  globalWorkspaceChatsDir,
  globalWorkspaceRunsDir,
  globalWorkspaceTelemetryDir,
  workspaceAistRoot,
  workspaceSettingsFile,
  workspaceToolsDir
} from '../../core/entities/storage/storage';
import { CliPaths } from './CliPaths';
import { RunCliOptions } from './RunCliOptions';

export function resolveCliPaths(
  options: Pick<RunCliOptions, 'cwd' | 'homeDir'> & { workspace?: string } = {}
): CliPaths {
  const cwd = options.cwd || process.cwd();
  const workspaceRoot = path.resolve(cwd, options.workspace || '.');
  const homeDir = options.homeDir || os.homedir();

  return {
    workspaceRoot,
    workspaceAistRoot: workspaceAistRoot(workspaceRoot),
    workspaceSettingsFile: workspaceSettingsFile(workspaceRoot),
    workspaceChatsDir: globalWorkspaceChatsDir(workspaceRoot, homeDir),
    workspaceRunsDir: globalWorkspaceRunsDir(workspaceRoot, homeDir),
    workspaceTelemetryDir: globalWorkspaceTelemetryDir(workspaceRoot, homeDir),
    workspaceToolsDir: workspaceToolsDir(workspaceRoot),
    globalAistRoot: globalAistRoot(homeDir),
    globalSettingsFile: globalSettingsFile(homeDir),
    globalMemoryFile: globalMemoryFile(homeDir),
    globalToolsDir: globalToolsDir(homeDir)
  };
}
