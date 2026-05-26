import type { AutonomousEngineId } from '../types';
import { vscode } from './vscode';

export type AutonomousLaunchDraft = {
  engineId: AutonomousEngineId;
  dryRun: boolean;
  workDir?: string;
  extraPrompt?: string;
};

/**
 * Что это: typed facade над IPC autonomous dashboard.
 * Почему отдельно от agentActions: chat-команды и autonomous lifecycle не должны
 * конфликтовать, особенно `stop` vs `autonomous.stopSession`.
 */
export const autonomousActions = {
  refresh() {
    vscode.postMessage({ type: 'autonomous.refresh' });
  },
  importLegacy() {
    vscode.postMessage({ type: 'autonomous.importLegacy' });
  },
  startFlow(flowId: string, launch: AutonomousLaunchDraft) {
    vscode.postMessage({ type: 'autonomous.startFlow', flowId, launch });
  },
  startRun(runId: string, launch: AutonomousLaunchDraft) {
    vscode.postMessage({ type: 'autonomous.startRun', runId, launch });
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
