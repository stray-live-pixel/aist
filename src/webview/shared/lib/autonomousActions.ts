import type { CreateAutonomousFlowInput, DeleteAutonomousFlowInput, EditableAutonomousFlowDefinition } from '../types';
import { vscode } from './vscode';

/**
 * Что это: typed facade над IPC редактора autonomous workflows.
 * Почему отдельно от agentActions: chat-команды и workflow lifecycle не должны
 * конфликтовать, особенно `stop` vs `autonomous.stopSession`.
 */
export const autonomousActions = {
  refresh() {
    vscode.postMessage({ type: 'autonomous.refresh' });
  },
  importLegacy() {
    vscode.postMessage({ type: 'autonomous.importLegacy' });
  },
  createFlow(flow: CreateAutonomousFlowInput) {
    vscode.postMessage({ type: 'autonomous.createFlow', flow });
  },
  deleteFlow(flow: DeleteAutonomousFlowInput) {
    vscode.postMessage({ type: 'autonomous.deleteFlow', flow });
  },
  saveFlow(flow: EditableAutonomousFlowDefinition) {
    vscode.postMessage({ type: 'autonomous.saveFlow', flow });
  },
  stopSession(sessionId: string) {
    vscode.postMessage({ type: 'autonomous.stopSession', sessionId });
  },
  revealSession(sessionId: string) {
    vscode.postMessage({ type: 'autonomous.revealSession', sessionId });
  },
  exportSession(sessionId: string, format: 'markdown' | 'json') {
    vscode.postMessage({ type: 'autonomous.exportSession', sessionId, format });
  }
};
