import { type AgentSkill } from '../../skills/skills';

export type ToolRegistryRefreshInput = {
  skills: readonly AgentSkill[];
  workspaceRoot: string;
  disabledProjectToolIds?: readonly string[];
  auxiliaryModelToolEnabled?: boolean;
};
