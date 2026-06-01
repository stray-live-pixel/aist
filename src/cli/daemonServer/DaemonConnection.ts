import type { DaemonClientCapabilities } from '../daemonProtocol';

/**
 * Что это: состояние одного JSON-RPC подключения к daemon socket.
 * Зачем нужно: daemon хранит framing buffer, подписку на events, capabilities и pending client requests.
 * Какую продуктовую проблему решает: несколько webview/CLI клиентов могут независимо получать события и ответы.
 */
export type DaemonConnection = {
  readonly socket: import('node:net').Socket;
  buffer: string;
  subscribed: boolean;
  capabilities: DaemonClientCapabilities;
  pendingClientRequests: Map<
    string,
    {
      resolve(value: unknown): void;
      reject(error: unknown): void;
      timeout: NodeJS.Timeout;
    }
  >;
};
