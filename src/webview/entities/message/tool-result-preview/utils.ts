import { pluralKey, type useI18n } from '../../../shared/i18n';
import type { ChatMessage } from '../../../shared/types';
import type { FileReference } from '../tool-message-model/types';
import { arrayValue, asRecord, asString } from '../tool-value';
import type { BashFact } from './types';

/**
 * Что это: извлечение фактов о bash-скрипте для отображения в dl-списке.
 * Зачем нужно: cwd, status, duration, signal — каждый факт имеет свой тон.
 */
export function getBashFacts(
  message: ChatMessage,
  result: Record<string, unknown> | undefined,
  t: ReturnType<typeof useI18n>['t']
): BashFact[] {
  const cwd = asString(result?.cwd) || asString(message.args?.cwd) || '.';
  const facts: BashFact[] = [{ label: t('tool.fact.cwd'), value: cwd }];

  if (!result) {
    const timeoutMs = numberValue(message.args?.timeoutMs);
    facts.unshift({ label: t('tool.fact.status'), value: t('tool.status.running'), tone: 'running' });
    if (timeoutMs !== undefined) facts.push({ label: t('tool.fact.timeout'), value: formatDuration(timeoutMs) });
    return facts;
  }

  const exitCode = numberValue(result.exitCode);
  const timedOut = Boolean(result.timedOut);
  const ok = result.ok === true;
  const status = timedOut
    ? t('tool.result.timedOut')
    : exitCode === undefined
      ? t('tool.result.finished')
      : t('tool.result.exit', { code: exitCode });
  facts.unshift({ label: t('tool.fact.status'), value: status, tone: ok ? 'ok' : 'error' });

  const durationMs = numberValue(result.durationMs);
  if (durationMs !== undefined) facts.push({ label: t('tool.fact.duration'), value: formatDuration(durationMs) });

  const signal = asString(result.signal);
  if (signal) facts.push({ label: t('tool.fact.signal'), value: signal });

  return facts;
}

/**
 * Что это: извлечение уникальных файлов из результата grep_search.
 * Зачем нужно: preview показывает только список файлов, без текста совпадений.
 */
export function getUniqueSearchFiles(result: Record<string, unknown>): FileReference[] {
  const files = arrayValue(result.matches).map(fileFromSearchMatch).filter(Boolean) as FileReference[];
  return uniqueFiles(files);
}

/**
 * Что это: фильтрация вторичных файлов (все кроме primary).
 * Зачем нужно: primary файл отображается отдельно в заголовке, остальные — списком в preview.
 */
export function getSecondaryFiles(files: FileReference[], primary?: FileReference): FileReference[] {
  if (!primary) return files;
  return files.filter((file) => fileKey(file) !== fileKey(primary));
}

/**
 * Что это: текстовая метка количества строк в выводе bash.
 * Зачем нужно: локализация plural form для «1 line», «5 lines» и т.д.
 */
export function getLineCountLabel(
  text: string,
  language: ReturnType<typeof useI18n>['language'],
  t: ReturnType<typeof useI18n>['t']
): string {
  const lines = text ? text.split(/\r?\n/).length : 0;
  return t(pluralKey(language, 'tool.result.lines', lines), { count: lines });
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60_000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${Math.round(durationMs / 1000)}s`;
}

function fileFromSearchMatch(match: unknown): FileReference | undefined {
  const item = asRecord(match);
  const path = asString(item?.path);
  return path ? { path } : undefined;
}

function uniqueFiles(files: FileReference[]): FileReference[] {
  const seen = new Set<string>();
  return files.filter((file) => {
    const key = fileKey(file);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fileKey(file: FileReference): string {
  return `${file.path}:${file.line || 0}:${file.column || 0}`;
}
