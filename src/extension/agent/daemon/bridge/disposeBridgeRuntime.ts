import type { BridgeRuntimeContext } from './BridgeRuntimeContext';

/**
 * Что это: освобождает ресурсы bridge при shutdown extension.
 * Зачем нужно: preview handles, JSON-RPC client и daemon process manager требуют явной очистки.
 * Какую продуктовую проблему решает: закрытие VS Code не оставляет висящие preview и socket-подключения.
 */
export function disposeBridgeRuntime({ context }: { context: BridgeRuntimeContext }): void {
  context.state.disposed = true;
  for (const handle of context.state.previewHandles.values()) {
    void handle.cleanup();
  }

  context.state.previewHandles.clear();
  context.state.client?.close();
  context.processManager.dispose();
}
