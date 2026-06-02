import { type FetchLike, type ModelClient } from '../../core/entities/model/modelTransport';
import { type ToolRegistry } from '../../core/features/tool-execution/toolRegistry';
import { type ToolRunnerExecutionAdapter } from '../../core/features/tool-execution/toolRunner';
import { CliWriter } from './CliWriter';

export type RunCliOptions = {
  cwd?: string;
  homeDir?: string;
  env?: Record<string, string | undefined>;
  stdin?: NodeJS.ReadableStream;
  fetch?: FetchLike;
  modelClient?: ModelClient;
  toolRegistry?: ToolRegistry;
  filesystemToolRunner?: ToolRunnerExecutionAdapter;
  stdout?: CliWriter;
  stderr?: CliWriter;
};
