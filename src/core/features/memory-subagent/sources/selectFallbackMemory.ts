import type { AgentMemoryItem } from '../../../entities/memory/memory';

const STOP_WORDS = new Set(['and', 'the', 'for', 'with', 'что', 'как', 'для', 'это', 'или', 'если']);
const LIMIT = 6;

/**
 * Что это: резервный быстрый подбор памяти без модели.
 * Зачем нужно: если субагент памяти недоступен, пользователь всё равно получает прежнее безопасное поведение.
 */
export function selectFallbackMemory(input: {
  prompt: string;
  items: AgentMemoryItem[];
  limit?: number;
}): AgentMemoryItem[] {
  const promptTokens = tokenize({ value: input.prompt });
  return input.items
    .filter((item) => item.enabled)
    .map((item) => ({ item, score: scoreMemory({ note: item.note, promptTokens }) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || right.item.updatedAt - left.item.updatedAt)
    .slice(0, input.limit || LIMIT)
    .map(({ item }) => item);
}

/**
 * Что это: считает простую близость заметки к запросу.
 * Зачем нужно: это не основная логика, а страховка для отказоустойчивости memory-субагента.
 */
function scoreMemory(input: { note: string; promptTokens: Set<string> }): number {
  let score = 0;
  for (const token of tokenize({ value: input.note })) {
    if (input.promptTokens.has(token)) {
      score += 2;
    }
  }

  if (/\b(always|prefer|avoid|when|если|всегда|предпочита)\b/i.test(input.note)) {
    score += 1;
  }

  return score;
}

/**
 * Что это: выделяет значимые слова из текста.
 * Зачем нужно: fallback должен быть простым и предсказуемым, без внешних зависимостей.
 */
function tokenize(input: { value: string }): Set<string> {
  return new Set(
    String(input.value || '')
      .toLowerCase()
      .split(/[^a-z0-9\u0400-\u04ff]+/i)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
  );
}
