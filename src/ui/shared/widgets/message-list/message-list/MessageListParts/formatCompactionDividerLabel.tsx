import { compactModelLabel } from './compactModelLabel';

export function formatCompactionDividerLabel(
  compactedAt: number | undefined,
  compactionModel: string | undefined
): string {
  return [
    'Context compacted',
    compactionModel ? `model: ${compactModelLabel(compactionModel)}` : undefined,
    compactedAt ? new Date(compactedAt).toLocaleString() : undefined
  ]
    .filter(Boolean)
    .join(' · ');
}
