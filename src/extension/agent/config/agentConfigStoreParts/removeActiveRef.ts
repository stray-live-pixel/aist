import { AgentInstructionKind } from './AgentInstructionKind';
import { AgentItemRef } from './AgentItemRef';
import { StoredAgentConfig } from './StoredAgentConfig';
import { getWorkspaceConfigPath } from './getWorkspaceConfigPath';
import { readAgentConfig } from './readAgentConfig';
import { refKey } from './refKey';
import { writeJsonConfig } from './writeJsonConfig';

export async function removeActiveRef(ref: AgentItemRef, kind: AgentInstructionKind): Promise<void> {
  const localConfig = readAgentConfig();
  const next: StoredAgentConfig = { ...localConfig };
  if (kind === 'instruction') {
    next.activeInstructionRefs = (localConfig.activeInstructionRefs || []).filter(
      (item) => refKey(item) !== refKey(ref)
    );
  }
  if (kind === 'mode' && localConfig.activeModeRef && refKey(localConfig.activeModeRef) === refKey(ref)) {
    next.activeModeRef = undefined;
  }
  await writeJsonConfig(getWorkspaceConfigPath(), next);
}
