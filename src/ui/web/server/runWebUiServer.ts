import type { ServerResponse } from 'node:http';

import type { CliWriter, RunCliOptions } from '../../../cli/router';
import { CLI_NAME } from '../../../cli/routerParts/CLI_NAME';
import { createServer } from './createServer';
import { connectDaemon } from './daemon/connectDaemon';
import { resolveStaticRoot } from './utils/fs/resolveStaticRoot';
import { writeSseToClients } from './utils/http/writeSse';

export type WebUiCommand = {
  readonly workspace?: string;
  readonly host: string;
  readonly port: number;
};

export async function runWebUiServer({
  command,
  workspaceRoot,
  options,
  stderr
}: {
  readonly command: WebUiCommand;
  readonly workspaceRoot: string;
  readonly options: RunCliOptions;
  readonly stderr: CliWriter;
}): Promise<number> {
  const { daemon, daemonClient, ownsDaemon } = await connectDaemon({ workspaceRoot, options, stderr });
  const eventClients = new Set<ServerResponse>();
  const removeEventListener = daemonClient.onEvent((event) => {
    writeSseToClients({ clients: eventClients, message: { type: 'daemon.event', event } });
  });

  const server = createServer({
    deps: {
      daemonClient,
      eventClients,
      staticRoot: resolveStaticRoot()
    }
  });

  await server.listen({ port: command.port, host: command.host });
  stderr(`${CLI_NAME} web listening on http://${command.host}:${command.port}\n`);
  stderr(`${CLI_NAME} daemon socket: ${daemon.socketPath}\n`);

  return new Promise<number>((resolve) => {
    let shuttingDown = false;
    const shutdown = (signal: NodeJS.Signals) => {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;
      stderr(`${CLI_NAME} web shutting down after ${signal}.\n`);
      removeEventListener();
      daemonClient.close();
      for (const client of eventClients) {
        client.end();
      }

      void server.close().finally(() => {
        const finish = () => {
          process.off('SIGINT', shutdown);
          process.off('SIGTERM', shutdown);
          resolve(0);
        };

        if (!ownsDaemon) {
          finish();
          return;
        }

        void daemon.close().finally(finish);
      });
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
}
