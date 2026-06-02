import fs from 'node:fs';

import { type JsonObject } from '../../../shared/types/types';
import { ConfigStoreError } from './ConfigStoreError';
import { ConfigStoreLogger } from './ConfigStoreLogger';
import { isJsonObject } from './isJsonObject';
import { isNodeError } from './isNodeError';
import { logStoreWarning } from './logStoreWarning';

export async function readJsonObject(
  filePath: string,
  kind: 'config' | 'secret',
  logger: ConfigStoreLogger | undefined
): Promise<JsonObject> {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;

    if (isJsonObject(parsed)) {
      return parsed;
    }

    const error = new ConfigStoreError(
      kind === 'config' ? 'config.invalidJson' : 'secret.invalidJson',
      `Ignoring ${kind} file because it does not contain a JSON object: ${filePath}`,
      { filePath }
    );
    logStoreWarning(logger, error.message, error);
    return {};
  } catch (cause) {
    if (isNodeError(cause) && cause.code === 'ENOENT') {
      return {};
    }

    const error = new ConfigStoreError(
      cause instanceof SyntaxError
        ? kind === 'config'
          ? 'config.invalidJson'
          : 'secret.invalidJson'
        : kind === 'config'
          ? 'config.readFailed'
          : 'secret.readFailed',
      `Ignoring unreadable ${kind} file: ${filePath}`,
      { filePath, cause }
    );
    logStoreWarning(logger, error.message, error);
    return {};
  }
}
