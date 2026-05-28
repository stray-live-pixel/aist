import * as vscode from 'vscode';

import type { ConfigStore, SecretStore } from '../../core/config';
import type { JsonValue } from '../../core/types';

export class VscodeConfigStore implements ConfigStore {
  constructor(private readonly namespace = 'openrouterAgent') {}

  async get<T extends JsonValue = JsonValue>(key: string, defaultValue?: T): Promise<T | undefined> {
    const value = vscode.workspace.getConfiguration(this.namespace).get<T>(key);
    return value === undefined ? defaultValue : value;
  }
}

export class VscodeSecretStore implements SecretStore {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  get(key: string): Promise<string | undefined> {
    return Promise.resolve(this.secrets.get(key));
  }

  async store(key: string, value: string): Promise<void> {
    await this.secrets.store(key, value);
  }

  async delete(key: string): Promise<void> {
    await this.secrets.delete(key);
  }
}

export function createVscodeConfigStore(): ConfigStore {
  return new VscodeConfigStore();
}

export function createVscodeSecretStore(secrets: vscode.SecretStorage): SecretStore {
  return new VscodeSecretStore(secrets);
}
