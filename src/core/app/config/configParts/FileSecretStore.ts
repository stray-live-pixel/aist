import os from 'node:os';

import { globalAistRoot, globalSecretsFile } from '../../../entities/storage/storage';
import { ConfigStoreError } from './ConfigStoreError';
import { ConfigStoreLogger } from './ConfigStoreLogger';
import { FileSecretStoreOptions } from './FileSecretStoreOptions';
import { SecretStore } from './SecretStore';
import { assertSecretKey } from './assertSecretKey';
import { deleteJsonPath } from './deleteJsonPath';
import { getJsonPath } from './getJsonPath';
import { readJsonObject } from './readJsonObject';
import { setJsonPath } from './setJsonPath';
import { writeSecretJson } from './writeSecretJson';

export class FileSecretStore implements SecretStore {
  readonly globalRootPath: string;
  readonly filePath: string;
  private readonly logger?: ConfigStoreLogger;

  constructor(options: FileSecretStoreOptions = {}) {
    const homeDir = options.homeDir || os.homedir();
    this.globalRootPath = globalAistRoot(homeDir);
    this.filePath = globalSecretsFile(homeDir);
    this.logger = options.logger;
  }

  async get(key: string): Promise<string | undefined> {
    assertSecretKey(key);
    const secrets = await readJsonObject(this.filePath, 'secret', this.logger);
    const value = getJsonPath(secrets, key);
    return typeof value === 'string' ? value : undefined;
  }

  async store(key: string, value: string): Promise<void> {
    assertSecretKey(key);
    if (typeof value !== 'string') {
      throw new ConfigStoreError('secret.invalidValue', 'Secret value must be a string.', {
        key,
        filePath: this.filePath
      });
    }

    const secrets = await readJsonObject(this.filePath, 'secret', this.logger);
    setJsonPath(secrets, key, value);
    await writeSecretJson(this.filePath, secrets, key);
  }

  async delete(key: string): Promise<void> {
    assertSecretKey(key);
    const secrets = await readJsonObject(this.filePath, 'secret', this.logger);
    deleteJsonPath(secrets, key);
    await writeSecretJson(this.filePath, secrets, key);
  }
}
