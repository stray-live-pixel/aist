import * as vscode from 'vscode';

import type { CodexClient } from '../../codex/client';
import type { OpenRouterClient } from '../../openrouter/client';
import type { OpenRouterModelOption } from '../../openrouter/types';
import { FALLBACK_MODEL_OPTIONS } from '../../shared/constants';
import { getErrorMessage } from '../../shared/errors';
import type { AistLogger } from '../../shared/logger';
import { mergeModels } from './models';
import { MODEL_LIST_CACHE_TTL_MS } from './refresh';

/**
 * Управляет списком доступных моделей OpenRouter и Codex.
 *
 * Контроллеру не нужно знать про TTL кеша, fallback-модели и частичные ошибки
 * провайдеров. Он только просит обновить каталог и читает текущий snapshot.
 */
export class AgentModelCatalog {
  private modelOptions: OpenRouterModelOption[] = [...FALLBACK_MODEL_OPTIONS];
  private modelsLoadedAt = 0;
  private modelLoadPromise: Promise<void> | undefined;

  constructor(
    private readonly openRouterClient: OpenRouterClient,
    private readonly codexClient: CodexClient,
    private readonly logger: AistLogger,
    private readonly onChanged: () => void
  ) {}

  getOptions(): OpenRouterModelOption[] {
    return this.modelOptions;
  }

  getOption(modelId: string): OpenRouterModelOption | undefined {
    return this.modelOptions.find((model) => model.id === modelId);
  }

  async refresh(force = false): Promise<void> {
    const now = Date.now();
    if (!force && (this.modelLoadPromise || now - this.modelsLoadedAt < MODEL_LIST_CACHE_TTL_MS)) {
      return this.modelLoadPromise || Promise.resolve();
    }

    this.logger.info('Loading model list');
    this.modelLoadPromise = this.loadModels()
      .then((models) => this.applyLoadedModels(models))
      .catch((error) => this.reportLoadError(error))
      .finally(() => {
        this.modelLoadPromise = undefined;
      });

    return this.modelLoadPromise;
  }

  private async loadModels(): Promise<OpenRouterModelOption[]> {
    const [openRouterResult, codexResult] = await Promise.allSettled([
      this.openRouterClient.listModels(),
      Promise.resolve(this.codexClient.listModels())
    ]);

    return mergeModels([...this.getOpenRouterModels(openRouterResult), ...this.getCodexModels(codexResult)]);
  }

  private getOpenRouterModels(result: PromiseSettledResult<OpenRouterModelOption[]>): OpenRouterModelOption[] {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    this.logger.error('OpenRouter model list unavailable', result.reason);
    return FALLBACK_MODEL_OPTIONS.filter((model) => model.provider === 'openrouter');
  }

  private getCodexModels(result: PromiseSettledResult<OpenRouterModelOption[]>): OpenRouterModelOption[] {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    this.logger.error('Codex model list unavailable', result.reason);
    return FALLBACK_MODEL_OPTIONS.filter((model) => model.provider === 'codex');
  }

  private applyLoadedModels(models: OpenRouterModelOption[]): void {
    if (!models.length) {
      this.logger.info('Model list was empty');
      return;
    }

    this.modelOptions = models;
    this.modelsLoadedAt = Date.now();
    this.onChanged();
    this.logger.info('Model list loaded', { count: models.length });
  }

  private reportLoadError(error: unknown): void {
    this.logger.error('Model list unavailable', error);
    vscode.window.setStatusBarMessage(`Model list unavailable: ${getErrorMessage(error)}`, 4000);
  }
}
