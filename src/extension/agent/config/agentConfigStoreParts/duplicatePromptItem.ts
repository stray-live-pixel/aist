import { AgentInstructionKind } from './AgentInstructionKind';
import { AgentItemScope } from './AgentItemScope';
import { StoredInstructionItem } from './StoredInstructionItem';
import { StoredModeItem } from './StoredModeItem';
import { createUniqueId } from './createUniqueId';
import { normalizeStoredInstructions } from './normalizeStoredInstructions';
import { normalizeStoredModes } from './normalizeStoredModes';
import { readScopedConfig } from './readScopedConfig';
import { writeScopedConfig } from './writeScopedConfig';

export async function duplicatePromptItem(
  scope: AgentItemScope,
  kind: AgentInstructionKind,
  id: string
): Promise<void> {
  const config = readScopedConfig(scope);
  const key = kind === 'instruction' ? 'instructions' : 'modes';
  const current =
    kind === 'instruction' ? normalizeStoredInstructions(config.instructions) : normalizeStoredModes(config.modes);
  const source = current.find((item) => item.id === id);
  if (!source) return;

  const nextId = createUniqueId(
    `${source.label} copy`,
    current.map((item) => item.id)
  );
  const copy =
    kind === 'instruction'
      ? { id: nextId, label: `${source.label} copy`, content: (source as StoredInstructionItem).content }
      : { id: nextId, label: `${source.label} copy`, instructions: (source as StoredModeItem).instructions };

  await writeScopedConfig(scope, { ...config, [key]: [...current, copy] });
}
