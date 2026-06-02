import type { AgentRunTelemetryRecord } from './AgentRunTelemetryRecord';

/**
 * Что это: общий mutable state telemetry store.
 * Зачем нужно: разнесённые по файлам операции читают и обновляют один кеш записей.
 * Какую проблему решает: после декомпозиции нет присваивания imported bindings и нет второго источника правды.
 */
export const telemetryState: {
  telemetryDirectory: string | undefined;
  recordsCache: AgentRunTelemetryRecord[];
} = {
  telemetryDirectory: undefined,
  recordsCache: []
};
