import * as vscode from 'vscode';
import { DEFAULT_MODEL, OPENROUTER_URL } from '../shared/constants';
import type { OpenRouterMessage, OpenRouterTool } from './types';

type OpenRouterResponse = {
  choices?: Array<{
    message?: OpenRouterMessage;
  }>;
};

export class OpenRouterClient {
  async chat(messages: OpenRouterMessage[], tools?: OpenRouterTool[], modelOverride?: string): Promise<OpenRouterMessage> {
    const config = vscode.workspace.getConfiguration('openrouterAgent');
    const apiKey = config.get<string>('apiKey') || process.env.OPENROUTER_API_KEY;
    const model = modelOverride || config.get<string>('model') || DEFAULT_MODEL;
    const siteUrl = config.get<string>('siteUrl') || '';
    const siteName = config.get<string>('siteName') || 'VS Code OpenRouter AI Agent';

    if (!apiKey) {
      throw new Error('Set openrouterAgent.apiKey in VS Code settings or OPENROUTER_API_KEY in your environment.');
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
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
}
