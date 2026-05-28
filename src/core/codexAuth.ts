import { createHash, randomBytes } from 'node:crypto';

import type { CodexAccessToken, CodexTokenProvider } from './codexTransport';
import type { SecretStore } from './config';
import { type FetchLike, type ModelTransportLogger, resolveFetch } from './modelTransport';

export const CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
export const CODEX_ISSUER = 'https://auth.openai.com';
export const CODEX_OAUTH_PORT = 1455;
export const CODEX_AUTH_SECRET_KEY = 'codex.oauth';
export const CODEX_TOKEN_REFRESH_MARGIN_MS = 30_000;

export type PkceCodes = {
  verifier: string;
  challenge: string;
};

export type CodexTokenResponse = {
  id_token?: string;
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

export type CodexAuth = {
  access: string;
  refresh: string;
  expires: number;
  accountId?: string;
};

type JwtClaims = {
  chatgpt_account_id?: string;
  organizations?: Array<{ id?: string }>;
  'https://api.openai.com/auth'?: {
    chatgpt_account_id?: string;
  };
};

export type CodexAuthSessionProviderOptions = {
  fetch?: FetchLike;
  logger?: ModelTransportLogger;
};

export class CodexAuthSessionProvider implements CodexTokenProvider {
  constructor(
    private readonly secretStore: SecretStore,
    private readonly options: CodexAuthSessionProviderOptions = {}
  ) {}

  async getToken(): Promise<CodexAccessToken> {
    const auth = await this.getValidAuth();
    return {
      accessToken: auth.access,
      accountId: auth.accountId
    };
  }

  async logout(): Promise<void> {
    await this.secretStore.delete(CODEX_AUTH_SECRET_KEY);
  }

  async isAuthenticated(): Promise<boolean> {
    return Boolean(await this.readAuth());
  }

  async saveTokenResponse(tokens: CodexTokenResponse, previous?: CodexAuth): Promise<CodexAuth> {
    const auth = toCodexAuth(tokens, previous || (await this.readAuth()));
    await this.saveAuth(auth);
    return auth;
  }

  private async getValidAuth(): Promise<CodexAuth> {
    const auth = await this.readAuth();
    if (!auth) {
      throw new Error('Run "aist: Login ChatGPT Codex" before using codex:* models.');
    }

    if (auth.expires - CODEX_TOKEN_REFRESH_MARGIN_MS > Date.now()) {
      return auth;
    }

    this.options.logger?.info('Refreshing ChatGPT Codex access token');
    const refreshed = await refreshAccessToken(auth.refresh, this.options.fetch);
    return this.saveTokenResponse(refreshed, auth);
  }

  private async readAuth(): Promise<CodexAuth | undefined> {
    const raw = await this.secretStore.get(CODEX_AUTH_SECRET_KEY);
    if (!raw) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(raw) as CodexAuth;
      if (parsed.access && parsed.refresh && Number.isFinite(parsed.expires)) {
        return parsed;
      }
    } catch {
      return undefined;
    }

    return undefined;
  }

  private async saveAuth(auth: CodexAuth): Promise<void> {
    await this.secretStore.store(CODEX_AUTH_SECRET_KEY, JSON.stringify(auth));
  }
}

export function generatePKCE(): PkceCodes {
  const verifier = randomString(43);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function buildAuthorizeUrl(redirectUri: string, pkce: PkceCodes, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CODEX_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'openid profile email offline_access',
    code_challenge: pkce.challenge,
    code_challenge_method: 'S256',
    id_token_add_organizations: 'true',
    codex_cli_simplified_flow: 'true',
    state,
    originator: 'opencode'
  });

  return `${CODEX_ISSUER}/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  pkce: PkceCodes,
  fetchImpl?: FetchLike
): Promise<CodexTokenResponse> {
  const response = await resolveFetch(fetchImpl)(`${CODEX_ISSUER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: CODEX_CLIENT_ID,
      code_verifier: pkce.verifier
    }).toString()
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json() as Promise<CodexTokenResponse>;
}

export async function refreshAccessToken(refreshToken: string, fetchImpl?: FetchLike): Promise<CodexTokenResponse> {
  const response = await resolveFetch(fetchImpl)(`${CODEX_ISSUER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CODEX_CLIENT_ID
    }).toString()
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json() as Promise<CodexTokenResponse>;
}

export function toCodexAuth(tokens: CodexTokenResponse, previous?: CodexAuth): CodexAuth {
  const refresh = tokens.refresh_token || previous?.refresh;
  if (!refresh) {
    throw new Error('ChatGPT Codex auth did not return a refresh token.');
  }

  return {
    access: tokens.access_token,
    refresh,
    expires: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    accountId: extractAccountId(tokens) || previous?.accountId
  };
}

function extractAccountId(tokens: CodexTokenResponse): string | undefined {
  const claims = parseJwtClaims(tokens.id_token) || parseJwtClaims(tokens.access_token);
  return (
    claims?.chatgpt_account_id ||
    claims?.['https://api.openai.com/auth']?.chatgpt_account_id ||
    claims?.organizations?.find((org) => org.id)?.id
  );
}

function parseJwtClaims(token: string | undefined): JwtClaims | undefined {
  const parts = token?.split('.');
  if (!parts || parts.length !== 3) {
    return undefined;
  }

  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as JwtClaims;
  } catch {
    return undefined;
  }
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  return Array.from(randomBytes(length), (byte) => chars[byte % chars.length]).join('');
}
