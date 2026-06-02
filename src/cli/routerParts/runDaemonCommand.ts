import { AistDaemonServer } from '../daemon';
import { CLI_NAME } from './CLI_NAME';
import { CliCommand } from './CliCommand';
import { CliWriter } from './CliWriter';
import { RunCliOptions } from './RunCliOptions';
import { getCliEnv } from './getCliEnv';
import { resolveCliPaths } from './resolveCliPaths';

export async function runDaemonCommand(
  command: Extract<CliCommand, { kind: 'daemon' }>,
  options: RunCliOptions,
  stderr: CliWriter
): Promise<number> {
  const paths = resolveCliPaths({ ...options, workspace: command.workspace });
  const server = new AistDaemonServer({
    workspaceRoot: paths.workspaceRoot,
    homeDir: options.homeDir,
    env: getCliEnv(options),
    socketPath: command.socket,
    fetch: options.fetch,
    modelClient: options.modelClient,
    toolRegistry: options.toolRegistry,
    filesystemToolRunner: options.filesystemToolRunner
  });

  await server.start();
  stderr(`${CLI_NAME} daemon listening on ${server.socketPath}\n`);

  return new Promise<number>((resolve) => {
    let shuttingDown = false;
    const shutdown = (signal: NodeJS.Signals) => {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;
      stderr(`${CLI_NAME} daemon shutting down after ${signal}.\n`);
      void server.close().finally(() => {
        process.off('SIGINT', shutdown);
        process.off('SIGTERM', shutdown);
        resolve(0);
      });
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
}
