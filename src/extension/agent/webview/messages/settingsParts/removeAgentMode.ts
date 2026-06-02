import * as vscode from 'vscode';

import { getErrorMessage } from '../../../../shared/errors';
import { t } from '../../../../shared/i18n';
import { deleteAgentMode } from '../../../config/settings';
import { type AgentWebviewMessageDeps } from '../types';

export async function removeAgentMode(modeId: string, deps: AgentWebviewMessageDeps): Promise<void> {
  try {
    const deleted = await deleteAgentMode(modeId);
    deps.logger.info('Agent mode delete attempted', { modeId, deleted });
  } catch (error) {
    deps.logger.error('Failed to delete agent mode', error);
    vscode.window.showErrorMessage(t('error.deleteAgentMode', { error: getErrorMessage(error) }));
  }
}
