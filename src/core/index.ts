import type { CoreRuntimeBoundary } from './shared/types/types';

// App layer
export * from './app/runtime/agentRuntime';
export * from './app/config/config';

// Processes layer
export * from './processes/autonomous';

// Entities layer
export * from './entities/chat/chatRepository';
export * from './entities/run/runRepository';
export * from './entities/memory/memory';
export * from './entities/model/codexAuth';
export * from './entities/model/codexTransport';
export * from './entities/model/modelDefaults';
export * from './entities/model/modelErrors';
export * from './entities/model/modelTransport';
export * from './entities/model/openrouterTransport';
export * from './entities/storage/storage';

// Features layer
export * from './features/approval/approvalProtocol';
export * from './features/compaction/compaction';
export * from './features/context/contextGovernor';
export * from './features/context/usage';
export * from './features/filesystem-tools/filesystemTools';
export * from './features/filesystem-tools/tools/applyPatch';
export * from './features/filesystem-tools/tools/semanticEdit';
export * from './features/planning/planningTools';
export * from './features/project-tools/projectTools';
export * from './features/reflection/reflection';
export * from './features/skills/skills';
export * from './features/system-prompt/prompts';
export * from './features/system-prompt/systemPrompt';
export * from './features/telemetry/telemetry';
export * from './features/tool-execution/toolCalls';
export * from './features/tool-execution/toolRegistry';
export * from './features/tool-execution/toolResultCompaction';
export * from './features/tool-execution/toolRunner';

// Shared layer
export * from './shared/lib/fileRepository';
export * from './shared/lib/frontmatter';
export * from './shared/lib/repoMap';
export * from './shared/lib/toolErrors';
export type * from './shared/types/types';

export const coreRuntimeBoundary: CoreRuntimeBoundary = {
  layer: 'core',
  vscodeImportsAllowed: false
};
