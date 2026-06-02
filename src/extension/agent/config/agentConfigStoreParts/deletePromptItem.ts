import { AgentInstructionKind } from './AgentInstructionKind';
import { AgentItemScope } from './AgentItemScope';
import { StoredAgentConfig } from './StoredAgentConfig';
import { normalizeStoredInstructions } from './normalizeStoredInstructions';
import { normalizeStoredModes } from './normalizeStoredModes';
import { readScopedConfig } from './readScopedConfig';
import { removeActiveRef } from './removeActiveRef';
import { writeScopedConfig } from './writeScopedConfig';

export async function deletePromptItem(scope: AgentItemScope, kind: AgentInstructionKind, id: string): Promise<void> {
  const config = readScopedConfig(scope);
  const key = kind === 'instruction' ? 'instructions' : 'modes';
  const current =
    kind === 'instruction' ? normalizeStoredInstructions(config.instructions) : normalizeStoredModes(config.modes);
  const nextConfig: StoredAgentConfig = { ...config, [key]: current.filter((item) => item.id !== id) };

  if (scope === 'local') {
    nextConfig.activeInstructionRefs = (config.activeInstructionRefs || []).filter(
      (ref) => !(ref.scope === scope && ref.id === id)
    );
    if (config.activeModeRef?.scope === scope && config.activeModeRef.id === id) nextConfig.activeModeRef = undefined;
  } else {
    await removeActiveRef({ scope, id }, kind);
  }

  await writeScopedConfig(scope, nextConfig);
}
