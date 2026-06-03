import { PERFORMANCE_TELEMETRY_SCHEMA_VERSION } from './PERFORMANCE_TELEMETRY_SCHEMA_VERSION';
import type { PerformanceTelemetryOperation, PerformanceTelemetryRecord } from './PerformanceTelemetryRecord';

const OPERATIONS = new Set<PerformanceTelemetryOperation>([
  'chat.create',
  'agent.request',
  'webview.render',
  'webview.patch',
  'webview.state'
]);

/**
 * Что это: безопасно приводит unknown JSON к performance telemetry record.
 * Зачем нужно: один повреждённый файл не должен ломать настройки и диагностику.
 * Какую продуктовую проблему решает: локальная аналитика остаётся устойчивой к ручным правкам storage.
 */
export function normalizePerformanceTelemetryRecord(value: unknown): PerformanceTelemetryRecord | undefined {
  const record = value as Partial<PerformanceTelemetryRecord> | undefined;
  if (!record || typeof record !== 'object') return undefined;
  if (!record.id || !record.operation || !OPERATIONS.has(record.operation)) return undefined;
  if (!record.extensionVersion || typeof record.extensionVersion !== 'string') return undefined;
  if (!isFiniteNumber(record.startedAt) || !isFiniteNumber(record.finishedAt) || !isFiniteNumber(record.durationMs)) {
    return undefined;
  }

  return {
    schemaVersion: Number(record.schemaVersion || PERFORMANCE_TELEMETRY_SCHEMA_VERSION),
    id: String(record.id),
    operation: record.operation,
    extensionVersion: record.extensionVersion,
    workspaceRoot: typeof record.workspaceRoot === 'string' ? record.workspaceRoot : undefined,
    chatId: typeof record.chatId === 'string' ? record.chatId : undefined,
    surfaceId: typeof record.surfaceId === 'string' ? record.surfaceId : undefined,
    surfaceKind: record.surfaceKind === 'sidebar' || record.surfaceKind === 'editor' ? record.surfaceKind : undefined,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    durationMs: Math.max(0, record.durationMs),
    status: record.status === 'error' || record.status === 'stopped' ? record.status : 'success',
    renderCount: isFiniteNumber(record.renderCount) ? record.renderCount : undefined,
    messageCount: isFiniteNumber(record.messageCount) ? record.messageCount : undefined,
    reason: typeof record.reason === 'string' ? record.reason : undefined,
    meta: normalizeMeta(record.meta)
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeMeta(value: unknown): Record<string, string | number | boolean> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const meta: Record<string, string | number | boolean> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string' || typeof item === 'boolean' || isFiniteNumber(item)) {
      meta[key] = item;
    }
  }

  return Object.keys(meta).length ? meta : undefined;
}
