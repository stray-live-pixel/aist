import { MAX_TRACE_ITEMS } from './MAX_TRACE_ITEMS';

export function uniqueLimited(values: string[], limit = MAX_TRACE_ITEMS): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}
