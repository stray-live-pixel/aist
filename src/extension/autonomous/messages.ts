import type {
  AutonomousEngineId,
  AutonomousState,
  CreateAutonomousFlowInput,
  DeleteAutonomousFlowInput,
  EditableAutonomousFlowDefinition
} from '../../core/processes/autonomous';

export type AutonomousExtensionToWebviewMessage =
  | { type: 'autonomous.state'; state: AutonomousState }
  | { type: 'autonomous.error'; message: string }
  | { type: 'autonomous.route'; route: 'flows' }
  | {
      type: 'autonomous.operation';
      operation: 'deleteFlow';
      flowId: string;
      status: 'done' | 'cancelled' | 'error';
    };

export type AutonomousWebviewToExtensionMessage =
  | { type: 'webviewReady' }
  | { type: 'autonomous.refresh' }
  | { type: 'autonomous.importLegacy' }
  | { type: 'autonomous.createFlow'; flow: CreateAutonomousFlowInput }
  | { type: 'autonomous.deleteFlow'; flow: DeleteAutonomousFlowInput }
  | { type: 'autonomous.saveFlow'; flow: EditableAutonomousFlowDefinition }
  | { type: 'autonomous.stopSession'; sessionId: string }
  | { type: 'autonomous.revealSession'; sessionId: string }
  | { type: 'autonomous.exportSession'; sessionId: string; format: 'markdown' | 'json' };

export function isAutonomousEngineId(value: string): value is AutonomousEngineId {
  return (
    value === 'claude-cli' ||
    value === 'codex-cli' ||
    value === 'openrouter-api' ||
    value === 'codex-api' ||
    value === 'dry-run'
  );
}
