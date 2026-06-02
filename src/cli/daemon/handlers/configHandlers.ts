import type { DaemonHandlerContext, DaemonHandlerResult } from './types';

/**
 * Что это: маршрутизатор JSON-RPC методов настроек и каталога моделей.
 * Зачем нужно: config.* и models.* меняются независимо от chat runtime.
 * Какую проблему решает: настройки daemon проще расширять без риска задеть запуск агента.
 */
export function handleConfigRpcMethod({
  context,
  method,
  params
}: {
  context: DaemonHandlerContext;
  method: string;
  params: unknown;
}): DaemonHandlerResult {
  switch (method) {
    case 'config.get':
      return { handled: true, result: context.call('configGet', params) };
    case 'config.update':
      return { handled: true, result: context.call('configUpdate', params) };
    case 'models.list':
      return { handled: true, result: context.call('modelsList', params, false) };
    case 'models.refresh':
      return { handled: true, result: context.call('modelsList', params, true) };
    default:
      return { handled: false };
  }
}
