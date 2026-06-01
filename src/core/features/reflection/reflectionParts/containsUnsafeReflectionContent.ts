import { PROMPT_INJECTION_PATTERNS } from './PROMPT_INJECTION_PATTERNS';
import { RAW_OUTPUT_PATTERNS } from './RAW_OUTPUT_PATTERNS';
import { SECRET_PATTERNS } from './SECRET_PATTERNS';

export function containsUnsafeReflectionContent(value: string): boolean {
  return [...SECRET_PATTERNS, ...RAW_OUTPUT_PATTERNS, ...PROMPT_INJECTION_PATTERNS].some((pattern) =>
    pattern.test(value)
  );
}
