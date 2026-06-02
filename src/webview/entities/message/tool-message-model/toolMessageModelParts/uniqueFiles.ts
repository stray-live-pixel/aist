import { type FileReference } from '../types';

export function uniqueFiles(files: FileReference[]): FileReference[] {
  const seen = new Set<string>();
  return files.filter((file) => {
    const key = `${file.path}:${file.line || 0}:${file.column || 0}:${file.endLine || 0}:${file.endColumn || 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
