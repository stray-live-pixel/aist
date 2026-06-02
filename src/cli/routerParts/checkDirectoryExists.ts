import fs from 'node:fs';

import { DoctorCheck } from './DoctorCheck';
import { formatError } from './formatError';

export async function checkDirectoryExists(name: string, directoryPath: string): Promise<DoctorCheck> {
  try {
    const stat = await fs.promises.stat(directoryPath);
    if (!stat.isDirectory()) {
      return { name, status: 'fail', message: `not a directory: ${directoryPath}` };
    }

    await fs.promises.access(directoryPath, fs.constants.R_OK);
    return { name, status: 'ok', message: `directory exists: ${directoryPath}` };
  } catch (error) {
    return { name, status: 'fail', message: `missing or inaccessible: ${directoryPath} (${formatError(error)})` };
  }
}
