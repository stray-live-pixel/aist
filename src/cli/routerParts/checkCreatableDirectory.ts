import fs from 'node:fs';

import { safeMkdir } from '../../core/entities/storage/storage';
import { DoctorCheck } from './DoctorCheck';
import { formatError } from './formatError';

export async function checkCreatableDirectory(name: string, directoryPath: string): Promise<DoctorCheck> {
  try {
    await safeMkdir(directoryPath);
    const stat = await fs.promises.stat(directoryPath);
    if (!stat.isDirectory()) {
      return { name, status: 'fail', message: `not a directory: ${directoryPath}` };
    }

    await fs.promises.access(directoryPath, fs.constants.R_OK | fs.constants.W_OK);
    return { name, status: 'ok', message: `accessible: ${directoryPath}` };
  } catch (error) {
    return { name, status: 'fail', message: `unavailable: ${directoryPath} (${formatError(error)})` };
  }
}
