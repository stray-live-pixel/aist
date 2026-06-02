import * as vscode from 'vscode';

import { getErrorMessage } from '../../../../shared/errors';
import { t } from '../../../../shared/i18n';
import { addAgentMode, setAgentMode } from '../../../config/settings';
import { type AgentWebviewMessageDeps } from '../types';

export async function createAgentMode(
  label: string,
  instructions: string,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  try {
    const mode = await addAgentMode(label, instructions);
    deps.logger.info('Agent mode added', { id: mode.id, label: mode.label });
    await setAgentMode(mode.id);
  } catch (error) {
    deps.logger.error('Failed to add agent mode', error);
    vscode.window.showErrorMessage(t('error.addAgentMode', { error: getErrorMessage(error) }));
  }
}
