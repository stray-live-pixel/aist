import fs from 'node:fs';

export async function removeTempBestEffort(tempPath: string): Promise<void> {
  try {
    await fs.promises.rm(tempPath, { force: true });
  } catch {
    // Best-effort cleanup only; the primary write error is reported to the caller.
  }
}
