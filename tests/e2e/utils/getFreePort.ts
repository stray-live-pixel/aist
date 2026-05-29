import net, { type AddressInfo } from 'node:net';

/**
 * Что это: резервирует свободный TCP-порт и сразу освобождает его.
 * Зачем нужно: VS Code CDP endpoint должен стартовать на порту, который с высокой вероятностью не занят.
 */
export function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      server.close(() => resolve(address.port));
    });
  });
}
