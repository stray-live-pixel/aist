import type { AutonomousEngineId, AutonomousLaunchOptions, AutonomousState } from './types';

export type AutonomousExtensionToWebviewMessage =
  | { type: 'autonomous.state'; state: AutonomousState }
  | { type: 'autonomous.error'; message: string };

export type AutonomousWebviewToExtensionMessage =
  | { type: 'webviewReady' }
  | { type: 'autonomous.refresh' }
  | { type: 'autonomous.importLegacy' }
  | { type: 'autonomous.startFlow'; flowId: string; launch: AutonomousLaunchOptions }
  | { type: 'autonomous.startRun'; runId: string; launch: AutonomousLaunchOptions }
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
