import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { FileBackedConfigStore, FileSecretStore, resolveConfigValue, resolveSecretValue } from './config';
import { globalAistRoot, globalSecretsFile, workspaceSettingsFile } from './storage';

const tempDirs: string[] = [];

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('FileBackedConfigStore', () => {
  it('reads workspace project settings before global user defaults and explicit defaults', async () => {
    const { workspaceRoot, homeDir } = createWorkspaceAndHome();
    const store = new FileBackedConfigStore({ workspaceRoot, homeDir });

    await store.set('model', 'global-model', { scope: 'global' });
    await store.set('model', 'workspace-model', { scope: 'workspace' });

    expect(await store.get('model', 'default-model')).toBe('workspace-model');

    await store.delete('model', { scope: 'workspace' });

    expect(await store.get('model', 'default-model')).toBe('global-model');

    await store.delete('model', { scope: 'global' });

    expect(await store.get('model', 'default-model')).toBe('default-model');
  });

  it('falls back and logs a structured warning for invalid JSON', async () => {
    const { workspaceRoot, homeDir } = createWorkspaceAndHome();
    const warnings: unknown[] = [];
    const store = new FileBackedConfigStore({
      workspaceRoot,
      homeDir,
      logger: { warn: (_message, details) => warnings.push(details) }
    });

    fs.mkdirSync(path.dirname(workspaceSettingsFile(workspaceRoot)), { recursive: true });
    fs.writeFileSync(workspaceSettingsFile(workspaceRoot), '{not-json', 'utf8');
    await store.set('model', 'global-model', { scope: 'global' });

    expect(await store.get('model', 'default-model')).toBe('global-model');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ code: 'config.invalidJson', filePath: workspaceSettingsFile(workspaceRoot) });
  });

  it('refuses to write OpenRouter API keys to workspace settings', async () => {
    const { workspaceRoot, homeDir } = createWorkspaceAndHome();
    const store = new FileBackedConfigStore({ workspaceRoot, homeDir });

    await expect(store.set('apiKey', 'sk-workspace', { scope: 'workspace' })).rejects.toMatchObject({
      code: 'config.workspaceSecretRejected'
    });
    await expect(store.set('openrouter', { apiKey: 'sk-workspace' }, { scope: 'workspace' })).rejects.toMatchObject({
      code: 'config.workspaceSecretRejected'
    });

    expect(fs.existsSync(workspaceSettingsFile(workspaceRoot))).toBe(false);
  });
});

describe('FileSecretStore', () => {
  it('writes secrets only under the global .aist-agent root', async () => {
    const { workspaceRoot, homeDir } = createWorkspaceAndHome();
    const store = new FileSecretStore({ homeDir });

    await store.store('openrouter.apiKey', 'sk-global');

    const workspaceSecretsFile = path.join(workspaceRoot, '.aist-agent', 'secrets.json');
    expect(store.globalRootPath).toBe(globalAistRoot(homeDir));
    expect(store.filePath).toBe(globalSecretsFile(homeDir));
    expect(JSON.parse(fs.readFileSync(globalSecretsFile(homeDir), 'utf8'))).toEqual({
      openrouter: { apiKey: 'sk-global' }
    });
    expect(fs.existsSync(workspaceSecretsFile)).toBe(false);
  });

  it('resolves env values before explicit secrets and defaults', async () => {
    const { homeDir } = createWorkspaceAndHome();
    const store = new FileSecretStore({ homeDir });

    await store.store('openrouter.apiKey', 'secret-value');

    await expect(
      resolveSecretValue(store, 'openrouter.apiKey', {
        env: { OPENROUTER_API_KEY: 'env-value' },
        envKey: 'OPENROUTER_API_KEY',
        defaultValue: 'default-value'
      })
    ).resolves.toBe('env-value');

    await expect(
      resolveSecretValue(store, 'openrouter.apiKey', {
        env: {},
        envKey: 'OPENROUTER_API_KEY',
        defaultValue: 'default-value'
      })
    ).resolves.toBe('secret-value');

    await store.delete('openrouter.apiKey');

    await expect(
      resolveSecretValue(store, 'openrouter.apiKey', {
        env: {},
        envKey: 'OPENROUTER_API_KEY',
        defaultValue: 'default-value'
      })
    ).resolves.toBe('default-value');
  });
});

describe('config value resolution', () => {
  it('resolves env values before explicit config and defaults', async () => {
    const { workspaceRoot, homeDir } = createWorkspaceAndHome();
    const store = new FileBackedConfigStore({ workspaceRoot, homeDir });

    await store.set('model', 'config-model', { scope: 'global' });

    await expect(
      resolveConfigValue(store, 'model', {
        env: { AIST_MODEL: 'env-model' },
        envKey: 'AIST_MODEL',
        defaultValue: 'default-model'
      })
    ).resolves.toBe('env-model');

    await expect(
      resolveConfigValue(store, 'model', {
        env: {},
        envKey: 'AIST_MODEL',
        defaultValue: 'default-model'
      })
    ).resolves.toBe('config-model');

    await store.delete('model', { scope: 'global' });

    await expect(
      resolveConfigValue(store, 'model', {
        env: {},
        envKey: 'AIST_MODEL',
        defaultValue: 'default-model'
      })
    ).resolves.toBe('default-model');
  });
});

function createWorkspaceAndHome(): { workspaceRoot: string; homeDir: string } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-config-'));
  tempDirs.push(tempDir);
  return {
    workspaceRoot: path.join(tempDir, 'workspace'),
    homeDir: path.join(tempDir, 'home')
  };
}
