/**
 * Что это: находит JSON object в ответе модели.
 * Зачем нужно: даже при строгой инструкции модель иногда оборачивает JSON в Markdown или пояснение.
 * Какую продуктовую проблему решает: isolated finalizer получает полезный title/message без ручного вмешательства.
 */
export function extractJsonObjectText({ rawText }: { rawText: string }): string {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) {
    return fenced;
  }

  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return rawText.slice(start, end + 1);
  }

  return rawText.trim();
}
