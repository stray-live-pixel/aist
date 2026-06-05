import { Translator } from './Translator';
import { formatDuration } from './formatDuration';

export function getBashSummary(result: Record<string, unknown>, t: Translator): string {
  const exitLabel = result.timedOut
    ? t('tool.summary.timedOut')
    : t('tool.summary.exit', { code: String(result.exitCode ?? t('tool.summary.unknown')) });
  const durationLabel = typeof result.durationMs === 'number' ? ` · ${formatDuration(result.durationMs)}` : '';

  return `${exitLabel}${durationLabel}`;
}
