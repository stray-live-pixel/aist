import * as os from 'node:os';

import { CodexAuthSessionProvider } from '../../core/codexAuth';
import { CodexResponsesTransport, type CodexResponsesTransportOptions } from '../../core/codexTransport';
import type { SecretStore } from '../../core/config';
import type { FetchLike } from '../../core/modelTransport';
import type {
  CodexServiceTier,
  ModelRequestLifecycleCallbacks,
  ModelStreamCallbacks,
  OpenRouterMessage,
  OpenRouterModelOption,
  OpenRouterTool
} from '../../core/types';
import type { AistLogger } from '../shared/logger';

export type CodexLoginAdapter = {
  login(): Promise<void>;
  logout(): Promise<void>;
};

export type CodexClientOptions = {
  fetch?: FetchLike;
  authProvider?: CodexAuthSessionProvider;
  transport?: CodexResponsesTransport;
  loginAdapter?: CodexLoginAdapter;
  transportOptions?: Omit<CodexResponsesTransportOptions, 'tokenProvider' | 'fetch' | 'logger'>;
};

export class CodexClient {
  private readonly authProvider: CodexAuthSessionProvider;
  private readonly transport: CodexResponsesTransport;
  private loginAdapter: CodexLoginAdapter | undefined;

  constructor(
    secretStore: SecretStore,
    private readonly logger: AistLogger,
    private readonly options: CodexClientOptions = {}
  ) {
    this.authProvider =
      options.authProvider || new CodexAuthSessionProvider(secretStore, { fetch: options.fetch, logger });
    this.transport =
      options.transport ||
      new CodexResponsesTransport({
        ...options.transportOptions,
        tokenProvider: this.authProvider,
        fetch: options.fetch,
        logger,
        userAgent: options.transportOptions?.userAgent || getCodexUserAgent()
      });
    this.loginAdapter = options.loginAdapter;
  }

  async login(): Promise<void> {
    await (await this.getLoginAdapter()).login();
  }

  async logout(): Promise<void> {
    await (await this.getLoginAdapter()).logout();
  }

  async isAuthenticated(): Promise<boolean> {
    return this.authProvider.isAuthenticated();
  }

  async chat(
    messages: OpenRouterMessage[],
    tools?: OpenRouterTool[],
    modelOverride?: string,
    signal?: AbortSignal,
    stream?: ModelStreamCallbacks,
    lifecycle?: ModelRequestLifecycleCallbacks,
    codexServiceTier: CodexServiceTier = 'auto'
  ): Promise<OpenRouterMessage> {
    return this.transport.chat(messages, tools, modelOverride, signal, stream, lifecycle, codexServiceTier);
  }

  listModels(): OpenRouterModelOption[] {
    return this.transport.listModels();
  }

  private async getLoginAdapter(): Promise<CodexLoginAdapter> {
    if (!this.loginAdapter) {
      const { VscodeCodexLoginAdapter } = await import('./vscodeLogin');
      this.loginAdapter = new VscodeCodexLoginAdapter(this.authProvider, this.logger, { fetch: this.options.fetch });
    }

    return this.loginAdapter;
  }
}

function getCodexUserAgent(): string {
  return `opencode/aist (${os.platform()} ${os.release()}; ${os.arch()})`;
}
