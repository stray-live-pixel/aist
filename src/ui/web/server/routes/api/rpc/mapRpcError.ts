import type { JsonRpcErrorObject } from '../../../../../../cli/daemonProtocol';

export function mapRpcError({ error }: { readonly error: unknown }): JsonRpcErrorObject {
  const maybeRpc = error as { readonly code?: number; readonly data?: unknown; readonly message?: string };
  if (typeof maybeRpc.code === 'number' && typeof maybeRpc.message === 'string') {
    return {
      code: maybeRpc.code,
      message: maybeRpc.message,
      data: typeof maybeRpc.data === 'object' && maybeRpc.data !== null ? (maybeRpc.data as never) : undefined
    };
  }

  return {
    code: -32603,
    message: error instanceof Error ? error.message : String(error),
    data: { code: 'request.failed' }
  };
}
