import type { ReasoningEffort, ToolPermissionMode } from './model';

export type AgentModeId = string;
export type ToolPermissionPresetId = string;

export type AgentMode = {
  id: AgentModeId;
  label: string;
  instructions: string;
};

export type AgentSkill = {
  id: string;
  label: string;
  description: string;
  command: string;
  permission: ToolPermissionMode;
  scope: AgentItemScope;
};

export type AgentConfigScope = 'workspace' | 'user';
export type AgentItemScope = 'global' | 'local';
export type AgentInstructionKind = 'instruction' | 'mode';
export type AgentMemoryScope = 'global' | 'project';

export type AgentItemRef = {
  scope: AgentItemScope;
  id: string;
};

export type AgentInstructionItem = {
  id: string;
  label: string;
  content: string;
  scope: AgentItemScope;
  kind: 'instruction';
};

export type AgentModeItem = {
  id: string;
  label: string;
  instructions: string;
  scope: AgentItemScope;
  kind: 'mode';
};

export type AgentPromptPreset = {
  id: string;
  label: string;
  instructionRefs: AgentItemRef[];
  modeRef?: AgentItemRef;
  scope: AgentItemScope;
};

export type AgentPromptConfig = {
  globalInstructions: AgentInstructionItem[];
  localInstructions: AgentInstructionItem[];
  globalModes: AgentModeItem[];
  localModes: AgentModeItem[];
  presets: AgentPromptPreset[];
  activeInstructionRefs: AgentItemRef[];
  activeModeRef?: AgentItemRef;
  activePresetId?: string;
};

export type AgentInstructionSource = {
  id: string;
  title: string;
  content: string;
  priority: number;
  kind: 'base' | 'file' | 'declarative' | 'mode' | 'custom' | 'skills';
  source?: string;
};

export type AgentMemoryItem = {
  id: string;
  scope: AgentMemoryScope;
  note: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type AgentReflectionCandidateKind =
  | 'memory_preference'
  | 'project_lesson'
  | 'verification_command'
  | 'declarative_definition';

export type AgentReflectionCandidateStatus = 'pending' | 'saved' | 'rejected';

export type AgentReflectionCandidate = {
  id: string;
  kind: AgentReflectionCandidateKind;
  title: string;
  content: string;
  reason?: string;
  scope?: 'global' | 'project' | 'local';
  status: AgentReflectionCandidateStatus;
  createdAt: number;
  sourceSubagentRunId?: string;
};

export type ToolPermissionItem = {
  name: string;
  label?: string;
  description: string;
  permission: ToolPermissionMode;
  defaultPermission: ToolPermissionMode;
  source?: 'builtin' | 'skill' | 'project';
  enabled?: boolean;
  version?: string;
};

export type ProjectToolDiagnostic = {
  code: string;
  message: string;
  path?: string;
  toolId?: string;
};

export type ToolPermissionPreset = {
  id: ToolPermissionPresetId;
  label: string;
  description: string;
  permissions: Record<string, ToolPermissionMode>;
};

export type CompactionSettings = {
  enabled: boolean;
  thresholdPercent: number;
  keepLastMessages: number;
  model: string;
  reasoningEffort: ReasoningEffort;
  allowTools: boolean;
};

export type ApprovalNotificationSettings = {
  enabled: boolean;
  systemNotifications: boolean;
  sound: boolean;
  volume: number;
  durationSeconds: number;
};

export type ComposerUiSettings = {
  gradientWhileBusy: boolean;
  minimizeOnBlur: boolean;
};
