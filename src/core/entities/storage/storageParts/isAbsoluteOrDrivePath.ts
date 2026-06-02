import path from 'node:path';

export function isAbsoluteOrDrivePath(inputPath: string): boolean {
  return (
    path.isAbsolute(inputPath) ||
    path.posix.isAbsolute(inputPath) ||
    path.win32.isAbsolute(inputPath) ||
    /^[A-Za-z]:/.test(inputPath)
  );
}
