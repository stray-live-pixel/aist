import { containsUnsafeTraceText } from './containsUnsafeTraceText';

export function truncateForReflection(value: string, maxChars: number): string {
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (containsUnsafeTraceText(normalized)) {
    return '[omitted unsafe trace text]';
  }
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}
