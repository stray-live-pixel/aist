export function formatChatModelLabel(model: string): string {
  const cleanModel = model
    .replace(/^openrouter[:/]/i, '')
    .replace(/^codex[:/]/i, '')
    .trim();

  return cleanModel || model || 'Agent';
}
