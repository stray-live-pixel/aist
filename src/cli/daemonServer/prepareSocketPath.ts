import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

import { safeMkdir } from '../../core/entities/storage/storage';
import { DaemonRpcError } from './DaemonRpcError';

/**
 * Что это: подготавливает socket path перед запуском daemon.
 * Зачем нужно: stale socket нужно удалить, а активный socket другого daemon — защитить.
 * Какую продуктовую проблему решает: CLI не стартует второй daemon поверх уже работающего процесса.
 */
export async function prepareSocketPath({ socketPath }: { socketPath: string }): Promise<void> {
  if (process.platform === 'win32') {
    return;
  }

  await safeMkdir(path.dirname(socketPath));
  if (!fs.existsSync(socketPath)) {
    return;
  }

  const existingServer = await canConnectSocket({ socketPath });
  if (existingServer) {
    throw new DaemonRpcError(-32000, 'daemon.alreadyRunning', `Daemon socket is already active: ${socketPath}`, {
      socketPath
    });
  }

  await fs.promises.rm(socketPath, { force: true });
}

/**
 * Что это: проверяет, отвечает ли существующий socket.
 * Зачем нужно: daemon различает stale file и реально работающий server.
 * Какую продуктовую проблему решает: перезапуск после падения чистит мусор, но не убивает живой процесс.
 */
export function canConnectSocket({ socketPath }: { socketPath: string }): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection(socketPath);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}
