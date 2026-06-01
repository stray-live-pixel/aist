import path from 'node:path';

export function createTempPath(targetPath: string): string {
  const directoryPath = path.dirname(targetPath);
  const baseName = path.basename(targetPath);
  return path.join(
    directoryPath,
    `.${baseName}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );
}
