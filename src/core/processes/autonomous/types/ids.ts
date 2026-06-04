export type AutonomousSourceKind = 'native' | 'legacy';

export type AutonomousEngineId =
  | 'claude-cli'
  | 'codex-cli'
  | 'openrouter-api'
  | 'codex-api'
  | 'dry-run'
  | 'aist-isolated-agent';

export type AutonomousSessionKind = 'flow' | 'run' | 'direct';

export type AutonomousSessionStatus = 'created' | 'running' | 'paused' | 'finished' | 'stopped' | 'error';
