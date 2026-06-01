import fs from 'node:fs';

import { type JsonObject } from '../../core/shared/types/types';
import { isJsonObject } from './isJsonObject';

export async function readOptionalJsonObject(filePath: string): Promise<JsonObject> {
  try {
    const parsed = JSON.parse(await fs.promises.readFile(filePath, 'utf8')) as unknown;
    return isJsonObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
