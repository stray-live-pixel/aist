export function stripCodexPrefix(modelId: string): string {
  return modelId.startsWith('codex:') ? modelId.slice('codex:'.length) : modelId;
}
