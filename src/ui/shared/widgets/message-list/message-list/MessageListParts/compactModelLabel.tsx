export function compactModelLabel(model: string): string {
  return (
    model
      .replace(/^openrouter[:/]/i, '')
      .replace(/^codex[:/]/i, '')
      .trim() || model
  );
}
