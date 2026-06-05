import { getAgentHost } from '../api/agentHost';
import type { CreateAutonomousFlowInput, DeleteAutonomousFlowInput, EditableAutonomousFlowDefinition } from '../types';

/**
 * Что это: typed facade над транспортом редактора autonomous workflows.
 * Почему отдельно от agentActions: chat-команды и workflow lifecycle не должны
 * конфликтовать, особенно `stop` vs `autonomous.stopSession`.
 */
export const autonomousActions = {
  refresh() {
    getAgentHost().postMessage({ type: 'autonomous.refresh' });
  },
  importLegacy() {
    getAgentHost().postMessage({ type: 'autonomous.importLegacy' });
  },
  createFlow(flow: CreateAutonomousFlowInput) {
    getAgentHost().postMessage({ type: 'autonomous.createFlow', flow });
  },
  deleteFlow(flow: DeleteAutonomousFlowInput) {
    getAgentHost().postMessage({ type: 'autonomous.deleteFlow', flow });
  },
  saveFlow(flow: EditableAutonomousFlowDefinition) {
    getAgentHost().postMessage({ type: 'autonomous.saveFlow', flow });
  },
  stopSession(sessionId: string) {
    getAgentHost().postMessage({ type: 'autonomous.stopSession', sessionId });
  },
  revealSession(sessionId: string) {
    getAgentHost().postMessage({ type: 'autonomous.revealSession', sessionId });
  },
  exportSession(sessionId: string, format: 'markdown' | 'json') {
    getAgentHost().postMessage({ type: 'autonomous.exportSession', sessionId, format });
  }
};
