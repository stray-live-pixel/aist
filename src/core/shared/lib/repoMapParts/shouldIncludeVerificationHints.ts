import { VERIFICATION_PROMPT_PATTERN } from './VERIFICATION_PROMPT_PATTERN';

export function shouldIncludeVerificationHints(prompt: string): boolean {
  return VERIFICATION_PROMPT_PATTERN.test(prompt);
}
