import * as vscode from 'vscode';

import { t } from '../../../../shared/i18n';
import { type WebviewSurface } from '../../../types';
import { type AgentWebviewMessageDeps } from '../types';

export async function compactChat(
  surface: WebviewSurface,
  chatId: string,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  const source = deps.chats.getChat(chatId);
  if (!source) {
    deps.logger.info('Ignoring compactChat for missing chat', { chatId });
    deps.sendState(surface);
    return;
  }

  if (source.busy) {
    vscode.window.setStatusBarMessage(t('status.stopBeforeCompacting'), 2400);
    deps.sendState(surface);
    return;
  }

  try {
    const chat = await deps.compactChat(source.id, 'manual');
    surface.setChatId(chat.id);
    deps.sendState();
  } catch (error) {
    deps.logger.error('Failed to compact chat', error);
    vscode.window.showErrorMessage(
      t('error.compactChat', { error: error instanceof Error ? error.message : String(error) })
    );
    deps.sendState(surface);
  }
}
