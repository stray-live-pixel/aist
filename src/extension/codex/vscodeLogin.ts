import { randomBytes } from 'node:crypto';
import { type Server, createServer } from 'node:http';
import * as vscode from 'vscode';

import {
  CODEX_OAUTH_PORT,
  type CodexAuthSessionProvider,
  type CodexTokenResponse,
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  generatePKCE
} from '../../core/entities/model/codexAuth';
import type { FetchLike, ModelTransportLogger } from '../../core/entities/model/modelTransport';
import { t } from '../shared/i18n';

export type VscodeCodexLoginAdapterOptions = {
  fetch?: FetchLike;
};

export class VscodeCodexLoginAdapter {
  constructor(
    private readonly authProvider: CodexAuthSessionProvider,
    private readonly logger: ModelTransportLogger,
    private readonly options: VscodeCodexLoginAdapterOptions = {}
  ) {}

  async login(): Promise<void> {
    const redirectUri = `http://localhost:${CODEX_OAUTH_PORT}/auth/callback`;
    const pkce = generatePKCE();
    const state = randomBytes(32).toString('base64url');
    const { callback } = await this.startOAuthServer(redirectUri, pkce, state);
    const authUrl = buildAuthorizeUrl(redirectUri, pkce, state);

    this.logger.info('Opening ChatGPT Codex OAuth page');
    await vscode.env.openExternal(vscode.Uri.parse(authUrl));

    const tokens = await callback;
    const auth = await this.authProvider.saveTokenResponse(tokens);
    this.logger.info('ChatGPT Codex login completed', { accountId: auth.accountId || null });
    vscode.window.setStatusBarMessage(t('status.codexLoginCompleted'), 2400);
  }

  async logout(): Promise<void> {
    await this.authProvider.logout();
    this.logger.info('ChatGPT Codex auth cleared');
    vscode.window.setStatusBarMessage(t('status.codexAuthCleared'), 2400);
  }

  private async startOAuthServer(
    redirectUri: string,
    pkce: ReturnType<typeof generatePKCE>,
    state: string
  ): Promise<{ callback: Promise<CodexTokenResponse> }> {
    let server: Server | undefined;

    const callback = new Promise<CodexTokenResponse>((resolve, reject) => {
      const timeout = setTimeout(
        () => {
          closeServer(server);
          reject(new Error('OAuth callback timeout - authorization took too long.'));
        },
        5 * 60 * 1000
      );

      server = createServer((req, res) => {
        const url = new URL(req.url || '/', redirectUri);

        if (url.pathname !== '/auth/callback') {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');

        if (error) {
          const message = errorDescription || error;
          clearTimeout(timeout);
          closeServer(server);
          reject(new Error(message));
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(getOAuthHtml('Authorization Failed', message));
          return;
        }

        if (!code || returnedState !== state) {
          const message = !code ? 'Missing authorization code.' : 'Invalid OAuth state.';
          clearTimeout(timeout);
          closeServer(server);
          reject(new Error(message));
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(getOAuthHtml('Authorization Failed', message));
          return;
        }

        exchangeCodeForTokens(code, redirectUri, pkce, this.options.fetch)
          .then((tokens) => {
            clearTimeout(timeout);
            closeServer(server);
            resolve(tokens);
          })
          .catch((tokenError) => {
            clearTimeout(timeout);
            closeServer(server);
            reject(tokenError);
          });

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getOAuthHtml('Authorization Successful', 'You can close this window and return to VS Code.'));
      });
    });

    await new Promise<void>((resolve, reject) => {
      server!.once('error', reject);
      server!.listen(CODEX_OAUTH_PORT, () => {
        server!.off('error', reject);
        resolve();
      });
    });

    return { callback };
  }
}

function closeServer(server: Server | undefined): void {
  server?.close();
}

function getOAuthHtml(title: string, message: string): string {
  return `<!doctype html><html><head><title>aist - ${title}</title></head><body><h1>${title}</h1><p>${message}</p><script>setTimeout(() => window.close(), 1500)</script></body></html>`;
}
