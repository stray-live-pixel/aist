import net, { type AddressInfo } from 'node:net';

/**
 * Что это: ищет свободный TCP-порт в заданном диапазоне.
 * Зачем нужно: VS Code CDP лучше запускать на обычных пользовательских портах, избегая пограничного 65535.
 */
export async function getFreePortInRange({ min, max }: { min: number; max: number }): Promise<number> {
  for (let port = min; port <= max; port += 1) {
    if (await canListen({ port })) {
      return port;
    }
  }

  throw new Error(`No free TCP port found in range ${min}-${max}.`);
}

function canListen({ port }: { port: number }): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.listen(port, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      server.close(() => resolve(address.port === port));
    });
  });
}
