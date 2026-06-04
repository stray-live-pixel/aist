import { AistDaemonServer } from '../../../../cli/daemon';
import { DaemonJsonRpcClient } from '../../../../cli/daemonClient/DaemonJsonRpcClient';
import type { CliWriter, RunCliOptions } from '../../../../cli/router';
import { CLI_NAME } from '../../../../cli/routerParts/CLI_NAME';
import { getCliEnv } from '../../../../cli/routerParts/getCliEnv';
import { registerBrowserClientHandlers } from './registerBrowserClientHandlers';

export async function connectDaemon({
  workspaceRoot,
  options,
  stderr
}: {
  readonly workspaceRoot: string;
  readonly options: RunCliOptions;
  readonly stderr: CliWriter;
}): Promise<{
  readonly daemon: AistDaemonServer;
  readonly daemonClient: DaemonJsonRpcClient;
  readonly ownsDaemon: boolean;
}> {
  const daemon = new AistDaemonServer({
    workspaceRoot,
    homeDir: options.homeDir,
    env: getCliEnv(options),
    fetch: options.fetch,
    modelClient: options.modelClient,
    toolRegistry: options.toolRegistry,
    filesystemToolRunner: options.filesystemToolRunner
  });
  let ownsDaemon = false;
  try {
    await daemon.start();
    ownsDaemon = true;
  } catch (error) {
    if (!isDaemonAlreadyRunningError({ error })) {
      throw error;
    }
    stderr(`${CLI_NAME} web reusing active daemon at ${daemon.socketPath}\n`);
  }

  const daemonClient = await DaemonJsonRpcClient.connect({ socketPath: daemon.socketPath });
  registerBrowserClientHandlers({ daemonClient });
  await daemonClient.request('client.capabilities', {
    capabilities: {
      activeEditorContext: false,
      notifications: false,
      openWorkspaceFile: false,
      vscodeEditableDiffPreview: false
    }
  });
  await daemonClient.subscribe();

  return { daemon, daemonClient, ownsDaemon };
}

function isDaemonAlreadyRunningError({ error }: { readonly error: unknown }): boolean {
  return error instanceof Error && (error as { readonly code?: string }).code === 'daemon.alreadyRunning';
}
