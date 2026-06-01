import { type AutonomousExportFormat } from '../../core/processes/autonomous';
import { parseAutonomousExportFormat } from './parseAutonomousExportFormat';

export function parseAutonomousFormatOptionToken(
  args: readonly string[],
  index: number,
  current: AutonomousExportFormat
): { readonly matched: boolean; readonly format: AutonomousExportFormat; readonly index: number } {
  const token = args[index];
  if (token === '--format') {
    const value = args[index + 1];
    return { matched: true, format: parseAutonomousExportFormat(value), index: index + 1 };
  }
  if (token.startsWith('--format=')) {
    return { matched: true, format: parseAutonomousExportFormat(token.slice('--format='.length)), index };
  }
  return { matched: false, format: current, index };
}
