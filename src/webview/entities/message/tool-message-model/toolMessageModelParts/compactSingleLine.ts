export function compactSingleLine(value?: string): string | undefined {
  const text = value?.replace(/\s+/g, ' ').trim();
  if (!text) return undefined;

  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}
