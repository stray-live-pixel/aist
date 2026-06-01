import { FileSecretStore } from '../../core/app/config/config';
import { CodexAuthSessionProvider } from '../../core/entities/model/codexAuth';
import { CodexAuthStatusResult } from './CodexAuthStatusResult';
import { RunCliOptions } from './RunCliOptions';
import { silentLogger } from './silentLogger';

export async function getCodexAuthStatus(options: RunCliOptions): Promise<CodexAuthStatusResult> {
  const secretStore = new FileSecretStore({ homeDir: options.homeDir, logger: silentLogger });
  const authProvider = new CodexAuthSessionProvider(secretStore, { fetch: options.fetch, logger: silentLogger });
  const authenticated = await authProvider.isAuthenticated();

  return {
    provider: 'codex',
    authenticated,
    source: authenticated ? 'global-secret' : 'none',
    login: 'vscode-extension'
  };
}
