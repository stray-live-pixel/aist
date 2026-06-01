import { removeUndefined } from './removeUndefined';

export function compactBase(result: Record<string, unknown>, extra: Record<string, unknown>): Record<string, unknown> {
  return removeUndefined({
    ok: result.ok,
    ...extra,
    userApprovalComment: result.userApprovalComment
  });
}
