import { tokenize } from './tokenize';

export function scoreMemory(note: string, promptTokens: Set<string>): number {
  const noteTokens = tokenize(note);
  let score = 0;
  for (const token of noteTokens) {
    if (promptTokens.has(token)) {
      score += 2;
    }
  }

  if (/\b(always|prefer|preference|use|avoid|when|если|всегда|предпочита)\b/i.test(note)) {
    score += 1;
  }

  return score;
}
