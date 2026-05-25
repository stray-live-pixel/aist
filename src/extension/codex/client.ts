import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { type Server, createServer } from 'node:http';
import * as os from 'node:os';
import * as vscode from 'vscode';

import type {
  ModelStreamCallbacks,
  OpenRouterMessage,
  OpenRouterModelOption,
  OpenRouterTool,
  ToolCall
} from '../openrouter/types';
import { CODEX_RESPONSES_URL, FALLBACK_MODEL_OPTIONS } from '../shared/constants';
import { t } from '../shared/i18n';
import type { AistLogger } from '../shared/logger';

const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const ISSUER = 'https://auth.openai.com';
const OAUTH_PORT = 1455;
const AUTH_SECRET_KEY = 'codex.oauth';
const TOKEN_REFRESH_MARGIN_MS = 30_000;

type PkceCodes = {
  verifier: string;
  challenge: string;
};

type TokenResponse = {
  id_token?: string;
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

type CodexAuth = {
  access: string;
  refresh: string;
  expires: number;
  accountId?: string;
};

type CodexResponse = {
  output_text?: string;
  output?: CodexOutputItem[];
  choices?: Array<{
    message?: OpenRouterMessage;
  }>;
};

type CodexStreamEvent = {
  type?: string;
  delta?: string;
  text?: string;
  item?: CodexOutputItem;
  part?: {
    text?: string;
  };
  response?: CodexResponse;
  error?: {
    message?: string;
  };
};

type CodexOutputItem =
  | {
      type?: 'message';
      role?: string;
      content?: Array<{ type?: string; text?: string }>;
    }
  | {
      type?: 'function_call';
      id?: string;
      call_id?: string;
      name?: string;
      arguments?: string;
    }
  | {
      type?: 'reasoning';
      summary?: Array<{ text?: string }>;
      content?: Array<{ text?: string }>;
    };

type CodexInputItem =
  | {
      role: 'user' | 'assistant';
      content: string;
    }
  | {
      type: 'function_call';
      call_id: string;
      name: string;
      arguments: string;
    }
  | {
      type: 'function_call_output';
      call_id: string;
      output: string;
    };

type JwtClaims = {
  chatgpt_account_id?: string;
  organizations?: Array<{ id?: string }>;
  'https://api.openai.com/auth'?: {
    chatgpt_account_id?: string;
  };
};

export class CodexClient {
  private readonly sessionId = randomUUID();

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly logger: AistLogger
  ) {}

  async login(): Promise<void> {
    const redirectUri = `http://localhost:${OAUTH_PORT}/auth/callback`;
    const pkce = generatePKCE();
    const state = randomBytes(32).toString('base64url');
    const { callback } = await this.startOAuthServer(redirectUri, pkce, state);
    const authUrl = buildAuthorizeUrl(redirectUri, pkce, state);

    this.logger.info('Opening ChatGPT Codex OAuth page');
    await vscode.env.openExternal(vscode.Uri.parse(authUrl));

    const tokens = await callback;
    const auth = toAuth(tokens);
    await this.saveAuth(auth);
    this.logger.info('ChatGPT Codex login completed', { accountId: auth.accountId || null });
    vscode.window.setStatusBarMessage(t('status.codexLoginCompleted'), 2400);
  }

  async logout(): Promise<void> {
    await this.context.secrets.delete(AUTH_SECRET_KEY);
    this.logger.info('ChatGPT Codex auth cleared');
    vscode.window.setStatusBarMessage(t('status.codexAuthCleared'), 2400);
  }

  async isAuthenticated(): Promise<boolean> {
    return Boolean(await this.readAuth());
  }

  async chat(
    messages: OpenRouterMessage[],
    tools?: OpenRouterTool[],
    modelOverride?: string,
    signal?: AbortSignal,
    stream?: ModelStreamCallbacks
  ): Promise<OpenRouterMessage> {
    const auth = await this.getValidAuth();
    const model = stripCodexPrefix(modelOverride || 'codex:gpt-5.1-codex');
    const payload = toCodexPayload(messages);
    const response = await fetch(CODEX_RESPONSES_URL, {
      method: 'POST',
      signal,
      headers: {
        authorization: `Bearer ${auth.access}`,
        'Content-Type': 'application/json',
        originator: 'opencode',
        'User-Agent': `opencode/aist (${os.platform()} ${os.release()}; ${os.arch()})`,
        session_id: this.sessionId,
        ...(auth.accountId ? { 'ChatGPT-Account-Id': auth.accountId } : {})
      },
      body: JSON.stringify({
        model,
        store: false,
        stream: true,
        instructions: payload.instructions,
        input: payload.input,
        ...(tools?.length ? { tools: tools.map(toCodexTool), tool_choice: 'auto' } : {})
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ChatGPT Codex request failed: ${response.status} ${response.statusText}\n${text}`);
    }

    if (response.body) {
      return parseCodexStream(response.body, stream);
    }

    return parseCodexResponse((await response.json()) as CodexResponse);
  }

  listModels(): OpenRouterModelOption[] {
    return FALLBACK_MODEL_OPTIONS.filter((model) => model.provider === 'codex');
  }

  private async startOAuthServer(
    redirectUri: string,
    pkce: PkceCodes,
    state: string
  ): Promise<{ callback: Promise<TokenResponse> }> {
    let server: Server | undefined;

    const callback = new Promise<TokenResponse>((resolve, reject) => {
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

        exchangeCodeForTokens(code, redirectUri, pkce)
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
      server!.listen(OAUTH_PORT, () => {
        server!.off('error', reject);
        resolve();
      });
    });

    return { callback };
  }

  private async getValidAuth(): Promise<CodexAuth> {
    const auth = await this.readAuth();
    if (!auth) {
      throw new Error('Run "aist: Login ChatGPT Codex" before using codex:* models.');
    }

    if (auth.expires - TOKEN_REFRESH_MARGIN_MS > Date.now()) {
      return auth;
    }

    this.logger.info('Refreshing ChatGPT Codex access token');
    const refreshed = await refreshAccessToken(auth.refresh);
    const nextAuth = toAuth(refreshed, auth);
    await this.saveAuth(nextAuth);
    return nextAuth;
  }

  private async readAuth(): Promise<CodexAuth | undefined> {
    const raw = await this.context.secrets.get(AUTH_SECRET_KEY);
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
    await this.context.secrets.store(AUTH_SECRET_KEY, JSON.stringify(auth));
  }
}

function generatePKCE(): PkceCodes {
  const verifier = randomString(43);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  return Array.from(randomBytes(length), (byte) => chars[byte % chars.length]).join('');
}

function buildAuthorizeUrl(redirectUri: string, pkce: PkceCodes, state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'openid profile email offline_access',
    code_challenge: pkce.challenge,
    code_challenge_method: 'S256',
    id_token_add_organizations: 'true',
    codex_cli_simplified_flow: 'true',
    state,
    originator: 'opencode'
  });

  return `${ISSUER}/oauth/authorize?${params.toString()}`;
}

async function exchangeCodeForTokens(code: string, redirectUri: string, pkce: PkceCodes): Promise<TokenResponse> {
  const response = await fetch(`${ISSUER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
      code_verifier: pkce.verifier
    }).toString()
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json() as Promise<TokenResponse>;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(`${ISSUER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID
    }).toString()
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json() as Promise<TokenResponse>;
}

function toAuth(tokens: TokenResponse, previous?: CodexAuth): CodexAuth {
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

function extractAccountId(tokens: TokenResponse): string | undefined {
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

function toCodexPayload(messages: OpenRouterMessage[]): { instructions: string; input: CodexInputItem[] } {
  const instructions: string[] = [];
  const input: CodexInputItem[] = [];

  for (const message of messages) {
    if (message.role === 'system') {
      if (message.content) {
        instructions.push(message.content);
      }
      continue;
    }

    if (message.role === 'tool') {
      if (message.tool_call_id) {
        input.push({
          type: 'function_call_output',
          call_id: message.tool_call_id,
          output: message.content || ''
        });
      }
      continue;
    }

    if (message.content) {
      input.push({
        role: message.role,
        content: message.content
      });
    }

    for (const toolCall of message.tool_calls || []) {
      input.push({
        type: 'function_call',
        call_id: toolCall.id,
        name: toolCall.function.name,
        arguments: stringifyToolArguments(toolCall.function.arguments)
      });
    }
  }

  return {
    instructions: instructions.join('\n\n').trim() || 'You are a helpful coding assistant.',
    input
  };
}

function toCodexTool(tool: OpenRouterTool): Record<string, unknown> {
  return {
    type: 'function',
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters
  };
}

function parseCodexResponse(data: CodexResponse): OpenRouterMessage {
  const chatMessage = data.choices?.[0]?.message;
  if (chatMessage) {
    return chatMessage;
  }

  const textParts: string[] = [];
  const reasoningParts: string[] = [];
  const toolCalls: ToolCall[] = [];

  for (const item of data.output || []) {
    if (item.type === 'message') {
      for (const content of item.content || []) {
        if (content.text) {
          textParts.push(content.text);
        }
      }
    }

    if (item.type === 'reasoning') {
      for (const content of [...(item.summary || []), ...(item.content || [])]) {
        if (content.text) {
          reasoningParts.push(content.text);
        }
      }
    }

    if (item.type === 'function_call' && item.name) {
      const id = item.call_id || item.id || randomUUID();
      toolCalls.push({
        id,
        type: 'function',
        function: {
          name: item.name,
          arguments: item.arguments || '{}'
        }
      });
    }
  }

  const content = textParts.join('\n').trim() || data.output_text || '';
  if (!content && !toolCalls.length) {
    throw new Error('ChatGPT Codex returned an empty response.');
  }

  return {
    role: 'assistant',
    content,
    ...(reasoningParts.length ? { reasoning: reasoningParts.join('\n') } : {}),
    ...(toolCalls.length ? { tool_calls: toolCalls } : {})
  };
}

async function parseCodexStream(
  body: ReadableStream<Uint8Array>,
  callbacks?: ModelStreamCallbacks
): Promise<OpenRouterMessage> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const outputItems: CodexOutputItem[] = [];
  const seenEventTypes = new Set<string>();
  let outputText = '';
  let completedResponse: CodexResponse | undefined;
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() || '';

    for (const part of parts) {
      const event = parseSseEvent(part);
      if (!event) {
        continue;
      }
      if (event.type) {
        seenEventTypes.add(event.type);
      }

      if (event.type === 'response.failed') {
        throw new Error(event.error?.message || 'ChatGPT Codex stream failed.');
      }

      if (event.type === 'response.completed' && event.response) {
        completedResponse = event.response;
      }

      if (event.type === 'response.output_text.delta' && event.delta) {
        outputText += event.delta;
        callbacks?.onContentDelta?.(event.delta);
      }

      if (!outputText && event.type === 'response.output_text.done' && event.text) {
        outputText = event.text;
        callbacks?.onContentDelta?.(event.text);
      }

      if (event.type === 'response.content_part.done' && event.part?.text) {
        outputText += event.part.text;
        callbacks?.onContentDelta?.(event.part.text);
      }

      if (event.type === 'response.output_item.done' && event.item) {
        outputItems.push(event.item);
      }
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    const event = parseSseEvent(buffer);
    if (event?.type) {
      seenEventTypes.add(event.type);
    }
    if (event?.type === 'response.completed' && event.response) {
      completedResponse = event.response;
    }
  }

  if (completedResponse) {
    const enrichedResponse: CodexResponse = {
      ...completedResponse,
      output_text: completedResponse.output_text || outputText,
      output: completedResponse.output?.length ? completedResponse.output : outputItems
    };

    try {
      return parseCodexResponse(enrichedResponse);
    } catch {
      if (outputText || outputItems.length) {
        return parseCodexResponse({
          output_text: outputText,
          output: outputItems
        });
      }
      throw new Error(
        `ChatGPT Codex returned an empty response. Stream events: ${[...seenEventTypes].join(', ') || 'none'}`
      );
    }
  }

  return parseCodexResponse({
    output_text: outputText,
    output: outputItems
  });
}

function parseSseEvent(chunk: string): CodexStreamEvent | undefined {
  const eventName = chunk
    .split(/\r?\n/)
    .find((line) => line.startsWith('event:'))
    ?.slice('event:'.length)
    .trim();
  const data = chunk
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trimStart())
    .join('\n')
    .trim();

  if (!data || data === '[DONE]') {
    return undefined;
  }

  try {
    const event = JSON.parse(data) as CodexStreamEvent;
    return event.type || !eventName ? event : { ...event, type: eventName };
  } catch {
    return undefined;
  }
}

function stringifyToolArguments(value: string | Record<string, unknown> | undefined): string {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value || {});
}

function stripCodexPrefix(modelId: string): string {
  return modelId.startsWith('codex:') ? modelId.slice('codex:'.length) : modelId;
}

function closeServer(server: Server | undefined): void {
  server?.close();
}

function getOAuthHtml(title: string, message: string): string {
  return `<!doctype html><html><head><title>aist - ${title}</title></head><body><h1>${title}</h1><p>${message}</p><script>setTimeout(() => window.close(), 1500)</script></body></html>`;
}
