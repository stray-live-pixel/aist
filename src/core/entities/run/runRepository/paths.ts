import path from 'node:path';

import { assertRepositoryId, childPath } from '../../../shared/lib/fileRepository';

/**
 * Что это: строит безопасный путь к каталогу одного run.
 * Зачем нужно: все файловые операции сначала валидируют id запуска.
 * Какую проблему решает: callers не могут выйти за пределы .aist-agent через path traversal.
 */
export function getRunPath({ rootPath, runId }: { rootPath: string; runId: string }): string {
  return childPath(rootPath, assertRepositoryId(runId, 'run'));
}

/**
 * Что это: путь к meta.json запуска.
 * Зачем нужно: meta хранит быстрый снимок состояния run.
 * Какую проблему решает: репозиторий не дублирует имена файлов в каждом методе.
 */
export function getRunMetaPath({ rootPath, runId }: { rootPath: string; runId: string }): string {
  return path.join(getRunPath({ rootPath, runId }), 'meta.json');
}

/**
 * Что это: путь к append-only runtime events.
 * Зачем нужно: события позволяют восстановить ход запуска по порядку.
 * Какую проблему решает: формат jsonl централизован в одном helper-файле.
 */
export function getRunEventsPath({ rootPath, runId }: { rootPath: string; runId: string }): string {
  return path.join(getRunPath({ rootPath, runId }), 'events.jsonl');
}

/**
 * Что это: путь к журналу approval-решений.
 * Зачем нужно: approval audit хранится отдельно от meta-снимка.
 * Какую проблему решает: изменение имени файла не требует править репозиторий целиком.
 */
export function getRunApprovalsPath({ rootPath, runId }: { rootPath: string; runId: string }): string {
  return path.join(getRunPath({ rootPath, runId }), 'approvals.jsonl');
}

/**
 * Что это: путь к журналу результатов tools.
 * Зачем нужно: большие результаты инструментов хранятся append-only рядом с run.
 * Какую проблему решает: runner и UI используют один физический формат данных.
 */
export function getRunToolResultsPath({ rootPath, runId }: { rootPath: string; runId: string }): string {
  return path.join(getRunPath({ rootPath, runId }), 'tool-results.jsonl');
}

/**
 * Что это: путь к telemetry.json запуска.
 * Зачем нужно: агрегаты телеметрии обновляются atomic-записью отдельно от событий.
 * Какую проблему решает: telemetry не смешивается с пользовательскими approval/tool логами.
 */
export function getRunTelemetryPath({ rootPath, runId }: { rootPath: string; runId: string }): string {
  return path.join(getRunPath({ rootPath, runId }), 'telemetry.json');
}
