import { type ChatMessage } from '../../../shared/types/types';
import { MAX_FIELD_CHARS } from './MAX_FIELD_CHARS';
import { asRecord } from './asRecord';
import { truncateForReflection } from './truncateForReflection';

export function getVerificationCommands(message: ChatMessage): string[] {
  if (message.name !== 'run_bash_script' || message.status !== 'done') {
    return [];
  }

  const script = typeof message.args?.script === 'string' ? message.args.script.trim() : '';
  if (!/\b(npm|pnpm|yarn|vitest|jest|tsc|eslint|playwright|cargo|go test|pytest)\b/i.test(script)) {
    return [];
  }

  const exitCode = message.modelResult?.exitCode ?? asRecord(message.modelResult?.result)?.exitCode;
  const suffix = exitCode === undefined ? '' : ` (exit ${String(exitCode)})`;
  return [truncateForReflection(`${script}${suffix}`, MAX_FIELD_CHARS)];
}
