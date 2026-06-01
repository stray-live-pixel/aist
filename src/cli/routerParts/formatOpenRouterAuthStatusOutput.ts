import { AuthStatusResult } from './AuthStatusResult';
import { formatAuthSource } from './formatAuthSource';
import { formatJsonOutput } from './formatJsonOutput';

export function formatOpenRouterAuthStatusOutput(result: AuthStatusResult, json: boolean): string {
  if (json) {
    return formatJsonOutput(result);
  }

  if (result.authenticated) {
    return `OpenRouter auth: configured (${formatAuthSource(result.source)}).\n`;
  }

  return `OpenRouter auth: not configured.\n`;
}
