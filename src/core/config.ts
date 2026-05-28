import fs from 'node:fs';
import os from 'node:os';

import {
  globalAistRoot,
  globalSecretsFile,
  globalSettingsFile,
  workspaceSettingsFile,
  writeJsonAtomic
} from './storage';
import type { JsonObject, JsonValue } from './types';

export type ConfigScope = 'workspace' | 'global';

export const OPENROUTER_API_KEY_SECRET_KEY = 'openrouter.apiKey';

export type ConfigStoreErrorCode =
  | 'config.invalidKey'
  | 'config.invalidJson'
  | 'config.readFailed'
  | 'config.writeFailed'
  | 'config.workspaceSecretRejected'
  | 'secret.invalidKey'
  | 'secret.invalidValue'
  | 'secret.invalidJson'
  | 'secret.readFailed'
  | 'secret.writeFailed'
  | 'secret.deleteFailed';

export type ConfigStoreErrorContext = {
  key?: string;
  filePath?: string;
  scope?: ConfigScope;
  cause?: unknown;
};

export class ConfigStoreError extends Error {
  readonly code: ConfigStoreErrorCode;
  readonly key?: string;
  readonly filePath?: string;
  readonly scope?: ConfigScope;
  readonly cause?: unknown;

  constructor(code: ConfigStoreErrorCode, message: string, context: ConfigStoreErrorContext = {}) {
    super(message);
    this.name = 'ConfigStoreError';
    this.code = code;
    this.key = context.key;
    this.filePath = context.filePath;
    this.scope = context.scope;
    this.cause = context.cause;
  }

  toJSON(): ConfigStoreErrorContext & { name: string; message: string; code: ConfigStoreErrorCode } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      key: this.key,
      filePath: this.filePath,
      scope: this.scope
    };
  }
}

export interface ConfigStore {
  get<T extends JsonValue = JsonValue>(key: string, defaultValue?: T): Promise<T | undefined>;
}

export interface WritableConfigStore extends ConfigStore {
  set(key: string, value: JsonValue, options?: { scope?: ConfigScope }): Promise<void>;
  delete(key: string, options?: { scope?: ConfigScope }): Promise<void>;
}

export interface SecretStore {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export type ConfigStoreLogger = {
  warn(message: string, details?: unknown): void;
};

export type FileBackedConfigStoreOptions = {
  workspaceRoot?: string;
  homeDir?: string;
  logger?: ConfigStoreLogger;
  workspaceSecretKeys?: readonly string[];
};

const DEFAULT_WORKSPACE_SECRET_KEYS = [
  'apiKey',
  'openrouter.apiKey',
  'openrouterAgent.apiKey',
  'OPENROUTER_API_KEY',
  'codex.oauth'
];

/**
 * Reads project settings from workspace `.aist-agent/settings.json` before user defaults
 * from global `~/.aist-agent/settings.json`.
 */
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

export type FileSecretStoreOptions = {
  homeDir?: string;
  logger?: ConfigStoreLogger;
};

/**
 * Temporary global-only file fallback for secrets until an OS keychain adapter is available.
 *
 * This store intentionally writes only to global `~/.aist-agent/secrets.json` and never
 * accepts a workspace root. Do not use it for long-term encrypted secret storage.
 */
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

export type ResolveConfigValueOptions<T extends JsonValue> = {
  env?: Record<string, string | undefined>;
  envKey?: string;
  defaultValue?: T;
  parseEnv?: (value: string) => T | undefined;
};

export async function resolveConfigValue<T extends JsonValue>(
  store: ConfigStore,
  key: string,
  options: ResolveConfigValueOptions<T> = {}
): Promise<T | undefined> {
  const envValue = readEnvValue(options.env, options.envKey);
  if (envValue !== undefined) {
    return options.parseEnv ? options.parseEnv(envValue) : (envValue as T);
  }

  const configValue = await store.get<T>(key);
  return configValue === undefined ? options.defaultValue : configValue;
}

export type ResolveSecretValueOptions = {
  env?: Record<string, string | undefined>;
  envKey?: string;
  defaultValue?: string;
};

export async function resolveSecretValue(
  store: Pick<SecretStore, 'get'>,
  key: string,
  options: ResolveSecretValueOptions = {}
): Promise<string | undefined> {
  const envValue = readEnvValue(options.env, options.envKey);
  if (envValue !== undefined) {
    return envValue;
  }

  const secretValue = await store.get(key);
  return secretValue === undefined ? options.defaultValue : secretValue;
}

async function readJsonObject(
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

async function writeConfigJson(filePath: string, settings: JsonObject, key: string, scope: ConfigScope): Promise<void> {
  try {
    await writeJsonAtomic(filePath, settings);
  } catch (cause) {
    throw new ConfigStoreError('config.writeFailed', `Failed to write config file: ${filePath}`, {
      key,
      filePath,
      scope,
      cause
    });
  }
}

async function writeSecretJson(filePath: string, secrets: JsonObject, key: string): Promise<void> {
  try {
    await writeJsonAtomic(filePath, secrets);
  } catch (cause) {
    throw new ConfigStoreError('secret.writeFailed', `Failed to write secret file: ${filePath}`, {
      key,
      filePath,
      cause
    });
  }
}

function readEnvValue(
  env: Record<string, string | undefined> | undefined,
  envKey: string | undefined
): string | undefined {
  if (!env || !envKey) {
    return undefined;
  }

  const value = env[envKey];
  return value === undefined || value === '' ? undefined : value;
}

function assertConfigKey(key: string): void {
  if (!isValidStoreKey(key)) {
    throw new ConfigStoreError('config.invalidKey', 'Config key must be a non-empty dot-separated path.', { key });
  }
}

function assertSecretKey(key: string): void {
  if (!isValidStoreKey(key)) {
    throw new ConfigStoreError('secret.invalidKey', 'Secret key must be a non-empty dot-separated path.', { key });
  }
}

function isValidStoreKey(key: string): boolean {
  return (
    typeof key === 'string' &&
    key.trim() === key &&
    key.length > 0 &&
    !key.includes('\0') &&
    !key.split('.').some((segment) => segment.length === 0)
  );
}

function isWorkspaceSecretWrite(key: string, value: JsonValue, secretKeys: Set<string>): boolean {
  if (secretKeys.has(key)) {
    return true;
  }

  for (const secretKey of secretKeys) {
    const prefix = `${key}.`;
    if (secretKey.startsWith(prefix) && isJsonObject(value)) {
      const nestedSecretValue = getJsonPath(value, secretKey.slice(prefix.length));
      if (nestedSecretValue !== undefined) {
        return true;
      }
    }
  }

  return false;
}

function getJsonPath(settings: JsonObject, key: string): JsonValue | undefined {
  if (Object.prototype.hasOwnProperty.call(settings, key)) {
    return settings[key];
  }

  const segments = key.split('.');
  let current: JsonValue | undefined = settings;

  for (const segment of segments) {
    if (!isJsonObject(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function setJsonPath(settings: JsonObject, key: string, value: JsonValue): void {
  const segments = key.split('.');
  const finalSegment = segments.pop()!;
  let current = settings;

  for (const segment of segments) {
    const next = current[segment];
    if (!isJsonObject(next)) {
      current[segment] = {};
    }
    current = current[segment] as JsonObject;
  }

  current[finalSegment] = value;
}

function deleteJsonPath(settings: JsonObject, key: string): void {
  if (Object.prototype.hasOwnProperty.call(settings, key)) {
    delete settings[key];
    return;
  }

  const segments = key.split('.');
  const finalSegment = segments.pop()!;
  let current: JsonValue | undefined = settings;

  for (const segment of segments) {
    if (!isJsonObject(current)) {
      return;
    }

    current = current[segment];
  }

  if (isJsonObject(current)) {
    delete current[finalSegment];
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function logStoreWarning(logger: ConfigStoreLogger | undefined, message: string, details: unknown): void {
  if (logger) {
    logger.warn(message, details);
    return;
  }

  console.warn(`[aist] ${message}`, details);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error !== null && typeof error === 'object' && 'code' in error;
}
