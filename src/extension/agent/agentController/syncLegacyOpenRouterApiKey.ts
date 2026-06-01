import * as vscode from 'vscode';

import { OPENROUTER_API_KEY_SECRET_KEY } from '../../../core/app/config/config';
import type { AgentControllerState } from './AgentControllerState';

/**
 * Что это: переносит legacy VS Code apiKey setting в daemon secret store.
 * Зачем нужно: старые пользователи не должны заново настраивать OpenRouter после перехода на daemon.
 * Какую продуктовую проблему решает: агент продолжает работать с уже сохранённым ключом.
 */
export async function syncLegacyOpenRouterApiKey({ state }: { state: AgentControllerState }): Promise<void> {
  const apiKey = vscode.workspace.getConfiguration('openrouterAgent').get<string>('apiKey')?.trim();
  if (!apiKey) return;

  const current = await state.secretStore.get(OPENROUTER_API_KEY_SECRET_KEY);
  if (current === apiKey) return;

  await state.secretStore.store(OPENROUTER_API_KEY_SECRET_KEY, apiKey);
  state.logger.info('Synced legacy VS Code OpenRouter API key setting into the daemon global secret store');
}
