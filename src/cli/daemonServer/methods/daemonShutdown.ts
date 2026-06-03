import type { AistDaemonServer } from '../AistDaemonServer';

/**
 * Что это: RPC-friendly graceful shutdown daemon.
 * Зачем нужно: detached daemon должен обновляться после reinstall extension, иначе VS Code подключается к старому коду.
 * Какую продуктовую проблему решает: пользователь не видит старые isolated-agent сценарии после установки новой сборки.
 */
export async function daemonShutdown(this: AistDaemonServer): Promise<{ operationId: string; accepted: true }> {
  const result = { operationId: this.idFactory(), accepted: true as const };
  setTimeout(() => {
    void this.close().finally(() => {
      process.exit(0);
    });
  }, 10).unref();
  return result;
}
