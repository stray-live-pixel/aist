import { STOP_WORDS } from './STOP_WORDS';

export function tokenize(value: string): Set<string> {
  return new Set(
    String(value || '')
      .toLowerCase()
      .split(/[^a-z0-9\u0400-\u04ff]+/i)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
  );
}
