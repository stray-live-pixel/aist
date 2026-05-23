import * as vscode from 'vscode';
import { DEFAULT_MODEL, OPENROUTER_MODELS_URL, OPENROUTER_URL } from '../shared/constants';
import type { OpenRouterMessage, OpenRouterModelOption, OpenRouterModelPricing, OpenRouterTool } from './types';

type OpenRouterResponse = {
  choices?: Array<{
    message?: OpenRouterMessage;
  }>;
};

type OpenRouterModelApiItem = {
  id?: string;
  name?: string;
  context_length?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  supported_parameters?: string[];
};

type OpenRouterModelsResponse = {
  data?: OpenRouterModelApiItem[];
};

export type ReasoningEffort = 'auto' | 'low' | 'medium' | 'high';

export class OpenRouterClient {
  async chat(
    messages: OpenRouterMessage[],
    tools?: OpenRouterTool[],
    modelOverride?: string,
    signal?: AbortSignal
  ): Promise<OpenRouterMessage> {
    const config = vscode.workspace.getConfiguration('openrouterAgent');
    const apiKey = config.get<string>('apiKey') || process.env.OPENROUTER_API_KEY;
    const model = modelOverride || config.get<string>('model') || DEFAULT_MODEL;
    const siteUrl = config.get<string>('siteUrl') || '';
    const siteName = config.get<string>('siteName') || 'aist';
    const reasoningEffort = normalizeReasoningEffort(config.get<string>('reasoningEffort'));

    if (!apiKey) {
      throw new Error('Set openrouterAgent.apiKey in VS Code settings or OPENROUTER_API_KEY in your environment.');
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(siteUrl ? { 'HTTP-Referer': siteUrl } : {}),
        ...(siteName ? { 'X-Title': siteName } : {})
      },
      body: JSON.stringify({
        model,
        messages,
        ...(tools ? { tools, tool_choice: 'auto' } : {}),
        ...(reasoningEffort === 'auto' ? {} : { reasoning: { effort: reasoningEffort } }),
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter request failed: ${response.status} ${response.statusText}\n${text}`);
    }

    const data = (await response.json()) as OpenRouterResponse;
    const answer = data.choices?.[0]?.message;

    if (!answer) {
      throw new Error('OpenRouter returned an empty response.');
    }

    return answer;
  }

  async listModels(): Promise<OpenRouterModelOption[]> {
    const config = vscode.workspace.getConfiguration('openrouterAgent');
    const apiKey = config.get<string>('apiKey') || process.env.OPENROUTER_API_KEY;
    const response = await fetch(`${OPENROUTER_MODELS_URL}?output_modalities=text`, {
      method: 'GET',
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter models request failed: ${response.status} ${response.statusText}\n${text}`);
    }

    const data = (await response.json()) as OpenRouterModelsResponse;
    const models = (data.data || [])
      .filter((model) => model.id)
      .map((model) => ({
        id: model.id!,
        name: model.name || model.id!,
        contextLength: model.context_length,
        pricing: parsePricing(model.pricing),
        supportsTools: Boolean(model.supported_parameters?.includes('tools'))
      }));

    return models.sort((a, b) => a.name.localeCompare(b.name));
  }
}

function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'auto';
}

function parsePricing(pricing: OpenRouterModelApiItem['pricing']): OpenRouterModelPricing | undefined {
  const prompt = parsePrice(pricing?.prompt);
  const completion = parsePrice(pricing?.completion);

  if (prompt === undefined && completion === undefined) {
    return undefined;
  }

  return { prompt, completion };
}

function parsePrice(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
