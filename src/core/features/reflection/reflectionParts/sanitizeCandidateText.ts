export function sanitizeCandidateText(input: unknown, maxChars: number): string | undefined {
  const normalized = String(input || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
  if (!normalized) {
    return undefined;
  }
  return normalized.length > maxChars ? normalized.slice(0, maxChars).trim() : normalized;
}
