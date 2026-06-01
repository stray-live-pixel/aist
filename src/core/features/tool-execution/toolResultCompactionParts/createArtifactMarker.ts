export function createArtifactMarker(toolName: string): Record<string, unknown> {
  return {
    compacted: true,
    tool: toolName,
    fullResultStoredIn: 'ChatMessage.result',
    reason: 'Full tool output omitted from model history to reduce context size.'
  };
}
