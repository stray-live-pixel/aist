import * as vscode from 'vscode';

import { getErrorMessage } from '../../../../shared/errors';
import { t } from '../../../../shared/i18n';
import { setAgentModeInstructions } from '../../../config/settings';
import { type AgentWebviewMessageDeps } from '../types';

export async function saveAgentModeInstructions(
  modeId: string,
  instructions: string,
  deps: AgentWebviewMessageDeps
): Promise<void> {
  try {
    await setAgentModeInstructions(modeId, instructions);
  } catch (error) {
    deps.logger.error('Failed to update agent mode instructions', error);
    vscode.window.showErrorMessage(t('error.saveAgentModeInstructions', { error: getErrorMessage(error) }));
  }
}
