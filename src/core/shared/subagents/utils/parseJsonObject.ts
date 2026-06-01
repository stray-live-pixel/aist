/**
 * Что это: достает JSON-объект из ответа модели.
 * Зачем нужно: субагенты просят модель отвечать строгим JSON, но провайдер иногда оборачивает его в markdown-блок.
 */
export function parseJsonObject(input: { content: string }): Record<string, unknown> | undefined {
  const trimmed = input.content.trim();
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
