export function appendOutput(
  current: string,
  addition: string,
  maxChars: number
): { text: string; truncated: boolean } {
  const next = current + addition;
  if (next.length <= maxChars) {
    return { text: next, truncated: false };
  }
  return { text: next.slice(0, maxChars), truncated: true };
}
