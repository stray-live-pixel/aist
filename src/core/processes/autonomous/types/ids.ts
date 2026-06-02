export type AutonomousSourceKind = 'native' | 'legacy';

export type AutonomousEngineId = 'claude-cli' | 'codex-cli' | 'openrouter-api' | 'codex-api' | 'dry-run';

export type AutonomousSessionKind = 'flow' | 'run' | 'direct';

export type AutonomousSessionStatus = 'created' | 'running' | 'paused' | 'finished' | 'stopped' | 'error';
