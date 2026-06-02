import { globalSettingsFile, workspaceSettingsFile } from '../../../entities/storage/storage';
import { type JsonValue } from '../../../shared/types/types';
import { ConfigScope } from './ConfigScope';
import { ConfigStoreError } from './ConfigStoreError';
import { ConfigStoreLogger } from './ConfigStoreLogger';
import { DEFAULT_WORKSPACE_SECRET_KEYS } from './DEFAULT_WORKSPACE_SECRET_KEYS';
import { FileBackedConfigStoreOptions } from './FileBackedConfigStoreOptions';
import { WritableConfigStore } from './WritableConfigStore';
import { assertConfigKey } from './assertConfigKey';
import { deleteJsonPath } from './deleteJsonPath';
import { getJsonPath } from './getJsonPath';
import { isWorkspaceSecretWrite } from './isWorkspaceSecretWrite';
import { readJsonObject } from './readJsonObject';
import { setJsonPath } from './setJsonPath';
import { writeConfigJson } from './writeConfigJson';

export class FileBackedConfigStore implements WritableConfigStore {
  readonly workspaceFilePath?: string;
  readonly globalFilePath: string;
  private readonly logger?: ConfigStoreLogger;
  private readonly workspaceSecretKeys: Set<string>;

  constructor(options: FileBackedConfigStoreOptions = {}) {
    this.workspaceFilePath = options.workspaceRoot ? workspaceSettingsFile(options.workspaceRoot) : undefined;
    this.globalFilePath = globalSettingsFile(options.homeDir);
    this.logger = options.logger;
    this.workspaceSecretKeys = new Set(options.workspaceSecretKeys || DEFAULT_WORKSPACE_SECRET_KEYS);
  }

  async get<T extends JsonValue = JsonValue>(key: string, defaultValue?: T): Promise<T | undefined> {
    assertConfigKey(key);

    if (this.workspaceFilePath) {
      const workspaceSettings = await readJsonObject(this.workspaceFilePath, 'config', this.logger);
      const workspaceValue = getJsonPath(workspaceSettings, key);
      if (workspaceValue !== undefined) {
        return workspaceValue as T;
      }
    }

    const globalSettings = await readJsonObject(this.globalFilePath, 'config', this.logger);
    const globalValue = getJsonPath(globalSettings, key);
    return globalValue === undefined ? defaultValue : (globalValue as T);
  }

  async set(key: string, value: JsonValue, options: { scope?: ConfigScope } = {}): Promise<void> {
    assertConfigKey(key);
    const scope = options.scope || 'workspace';

    if (scope === 'workspace' && isWorkspaceSecretWrite(key, value, this.workspaceSecretKeys)) {
      throw new ConfigStoreError(
        'config.workspaceSecretRejected',
        `Refusing to write secret-like config key to workspace settings: ${key}`,
        { key, filePath: this.workspaceFilePath, scope }
      );
    }

    const targetPath = this.getConfigPath(scope);
    const settings = await readJsonObject(targetPath, 'config', this.logger);
    setJsonPath(settings, key, value);
    await writeConfigJson(targetPath, settings, key, scope);
  }

  async delete(key: string, options: { scope?: ConfigScope } = {}): Promise<void> {
    assertConfigKey(key);
    const scope = options.scope || 'workspace';
    const targetPath = this.getConfigPath(scope);
    const settings = await readJsonObject(targetPath, 'config', this.logger);
    deleteJsonPath(settings, key);
    await writeConfigJson(targetPath, settings, key, scope);
  }

  private getConfigPath(scope: ConfigScope): string {
    if (scope === 'global') {
      return this.globalFilePath;
    }

    if (!this.workspaceFilePath) {
      throw new ConfigStoreError('config.writeFailed', 'Workspace config writes require a workspace root.', { scope });
    }

    return this.workspaceFilePath;
  }
}
