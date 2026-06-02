export function encodeWorkspaceStorageKey(workspaceRoot: string): string {
  return Buffer.from(workspaceRoot, 'utf8').toString('base64url');
}
