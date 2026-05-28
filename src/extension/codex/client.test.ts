import { describe, expect, it } from 'vitest';

import type { SecretStore } from '../../core/config';
import type { FetchLike } from '../../core/modelTransport';
import type { AistLogger } from '../shared/logger';
import { CodexClient, type CodexLoginAdapter } from './client';

describe('CodexClient extension wrapper', () => {
  it('delegates chat through the core Responses transport with normalized settings supplied by the caller', async () => {
    const requests: CapturedRequest[] = [];
    const fetch = captureTextFetch(
      requests,
      sseData({
        type: 'response.completed',
        response: {
          output_text: 'done',
          usage: { input_tokens: 4, output_tokens: 5, total_tokens: 9 }
        }
      }) + '\n\n'
    );
    const client = new CodexClient(createSecretStore(), createLogger(), {
      fetch,
      loginAdapter: createLoginAdapter(),
      transportOptions: {
        sessionId: 'session-1',
        userAgent: 'aist-test-agent'
      }
    });

    const response = await client.chat(
      [{ role: 'user', content: 'hello' }],
      undefined,
      'codex:gpt-5.1-codex',
      undefined,
      undefined,
      undefined,
      'priority'
    );

    expect(response.usage).toEqual({ promptTokens: 4, completionTokens: 5, totalTokens: 9 });
    expect(requests[0].init?.headers).toMatchObject({
      authorization: 'Bearer access-token',
      session_id: 'session-1',
      'User-Agent': 'aist-test-agent',
      'ChatGPT-Account-Id': 'account-1'
    });
    expect(readJsonBody(requests[0].init)).toMatchObject({
      model: 'gpt-5.1-codex',
      stream: true,
      service_tier: 'priority'
    });
  });

  it('keeps login/logout in the VS Code UI adapter', async () => {
    const calls: string[] = [];
    const client = new CodexClient(createSecretStore(), createLogger(), {
      fetch: captureTextFetch([], ''),
      loginAdapter: {
        async login() {
          calls.push('login');
        },
        async logout() {
          calls.push('logout');
        }
      }
    });

    await client.login();
    await client.logout();

    expect(calls).toEqual(['login', 'logout']);
  });
});

type CapturedRequest = {
  input: RequestInfo | URL;
  init?: RequestInit;
};

function createSecretStore(): SecretStore {
  const auth = {
    access: 'access-token',
    refresh: 'refresh-token',
    expires: Date.now() + 60_000,
    accountId: 'account-1'
  };

  return {
    async get() {
      return JSON.stringify(auth);
    },
    async store() {},
    async delete() {}
  };
}

function createLogger(): AistLogger {
  return {
    info() {},
    error() {},
    show() {},
    dispose() {}
  };
}

function createLoginAdapter(): CodexLoginAdapter {
  return {
    async login() {},
    async logout() {}
  };
}

function captureTextFetch(requests: CapturedRequest[], body: string): FetchLike {
  return async (input, init) => {
    requests.push({ input, init });
    return new Response(body, {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'text/event-stream' }
    });
  };
}

function readJsonBody(init: RequestInit | undefined): unknown {
  return JSON.parse(String(init?.body));
}

function sseData(data: unknown): string {
  return `data: ${JSON.stringify(data)}`;
}
