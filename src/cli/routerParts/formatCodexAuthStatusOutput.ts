import { CodexAuthStatusResult } from './CodexAuthStatusResult';
import { formatAuthSource } from './formatAuthSource';
import { formatJsonOutput } from './formatJsonOutput';

export function formatCodexAuthStatusOutput(result: CodexAuthStatusResult, json: boolean): string {
  if (json) {
    return formatJsonOutput(result);
  }

  if (result.authenticated) {
    return `ChatGPT Codex auth: configured (${formatAuthSource(result.source)}).\n`;
  }

  return `ChatGPT Codex auth: not configured. Login is currently managed by the VS Code extension.\n`;
}
