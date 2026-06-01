import type { ConfigStoreLogger } from '../../../app/config/config';
import type { ModelTransportLogger } from '../../../entities/model/modelTransport';

/**
 * Что это: общий logger для config-store и model transports автономного режима.
 * Зачем нужно: backend прокидывает один логгер во все нижние сервисы.
 * Какую продуктовую проблему решает: диагностика автономных запусков остаётся связанной и понятной.
 */
export type AutonomousBackendLogger = ConfigStoreLogger & ModelTransportLogger;
