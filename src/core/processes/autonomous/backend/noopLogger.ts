import type { AutonomousBackendLogger } from './AutonomousBackendLogger';

/**
 * Что это: безопасный logger по умолчанию для автономного backend.
 * Зачем нужно: backend не должен проверять logger на undefined перед каждым warn/info/error.
 * Какую продуктовую проблему решает: автономный режим работает в тестах и CLI без обязательной настройки логирования.
 */
export const noopLogger: AutonomousBackendLogger = {
  warn: (): void => {},
  info: (): void => {},
  error: (): void => {}
};
