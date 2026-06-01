import { CliApprovalMode } from './CliApprovalMode';
import { parseCliApprovalMode } from './parseCliApprovalMode';

export function parseApprovalModeOptionToken(
  command: string,
  args: readonly string[],
  index: number,
  current: CliApprovalMode
): { readonly matched: boolean; readonly approvalMode: CliApprovalMode; readonly index: number } {
  const token = args[index];

  if (token === '--approval-mode') {
    const value = args[index + 1];
    return { matched: true, approvalMode: parseCliApprovalMode(command, value), index: index + 1 };
  }

  if (token.startsWith('--approval-mode=')) {
    return {
      matched: true,
      approvalMode: parseCliApprovalMode(command, token.slice('--approval-mode='.length)),
      index
    };
  }

  return { matched: false, approvalMode: current, index };
}
