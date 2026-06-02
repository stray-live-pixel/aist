/**
 * Что это: достаёт runId из telemetry object старого формата.
 * Зачем нужно: runner поддерживает explicit runId и legacy telemetry.runId.
 * Какую продуктовую проблему решает: события tool-call остаются связаны с run после миграции API.
 */
export function getTelemetryRunId({ telemetry }: { telemetry: unknown }): string | undefined {
  return telemetry && typeof telemetry === 'object' && typeof (telemetry as Record<string, unknown>).runId === 'string'
    ? String((telemetry as Record<string, unknown>).runId)
    : undefined;
}
