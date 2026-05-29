import type http from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * Что это: запускает HTTP server на свободном localhost-порту.
 * Зачем нужно: e2e mock модели должен быть изолированным для каждого worker и не конфликтовать с локальными сервисами.
 */
export function listenOnFreePort({ server }: { server: http.Server }): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      resolve(address.port);
    });
  });
}
