import { getRepoMap } from './getRepoMap';
import { shouldIncludeVerificationHints } from './shouldIncludeVerificationHints';

export function getRepoVerificationContextNote(workspacePath: string, prompt: string): string {
  if (!shouldIncludeVerificationHints(prompt)) {
    return '';
  }

  const verificationHints = getRepoMap(workspacePath).verificationHints;
  if (!verificationHints.length) {
    return '';
  }

  return `Verification hints from package scripts: ${verificationHints.join('; ')}.`;
}
