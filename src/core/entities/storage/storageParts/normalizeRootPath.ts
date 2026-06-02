import { normalizeStoragePath } from './normalizeStoragePath';

export function normalizeRootPath(rootPath: string, label: string): string {
  return normalizeStoragePath(rootPath, label);
}
