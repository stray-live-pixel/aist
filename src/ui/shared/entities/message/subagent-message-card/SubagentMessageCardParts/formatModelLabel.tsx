export function formatModelLabel(model: string): string {
  return (
    model
      .replace(/^openrouter[:/]/i, '')
      .replace(/^codex[:/]/i, '')
      .trim() || model
  );
}
