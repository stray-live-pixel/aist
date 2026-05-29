/**
 * Что это: строит минимальный OpenRouter-compatible chat completion response.
 * Зачем нужно: daemon получает тот же контракт, что и от провайдера, но ответ полностью контролируется e2e.
 */
export function buildChatResponse({ message }: { message: Record<string, unknown> }): Record<string, unknown> {
  return {
    choices: [{ message }],
    usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 }
  };
}
