export function parseJsonObject(content: string): Record<string, unknown> | undefined {
  const trimmed = content.trim();
  const json = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim() || trimmed;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}
