import { ConfigStoreLogger } from './ConfigStoreLogger';

export function logStoreWarning(logger: ConfigStoreLogger | undefined, message: string, details: unknown): void {
  if (logger) {
    logger.warn(message, details);
    return;
  }

  console.warn(`[aist] ${message}`, details);
}
