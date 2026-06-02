import { AgentInstructionKind } from './AgentInstructionKind';
import { AgentItemScope } from './AgentItemScope';
import { createUniqueId } from './createUniqueId';
import { normalizeStoredInstructions } from './normalizeStoredInstructions';
import { normalizeStoredModes } from './normalizeStoredModes';
import { readScopedConfig } from './readScopedConfig';
import { writeScopedConfig } from './writeScopedConfig';

export async function upsertPromptItem(input: {
  scope: AgentItemScope;
  kind: AgentInstructionKind;
  id?: string;
  label: string;
  content: string;
}): Promise<void> {
  const config = readScopedConfig(input.scope);
  const key = input.kind === 'instruction' ? 'instructions' : 'modes';
  const current =
    input.kind === 'instruction'
      ? normalizeStoredInstructions(config.instructions)
      : normalizeStoredModes(config.modes);
  const id =
    input.id ||
    createUniqueId(
      input.label,
      current.map((item) => item.id)
    );
  const label = input.label.trim() || (input.kind === 'instruction' ? 'Instruction' : 'Mode');
  const content = input.content.trim();
  const next = current.some((item) => item.id === id)
    ? current.map((item) =>
        item.id === id
          ? input.kind === 'instruction'
            ? { id, label, content }
            : { id, label, instructions: content }
          : item
      )
    : [...current, input.kind === 'instruction' ? { id, label, content } : { id, label, instructions: content }];

  await writeScopedConfig(input.scope, { ...config, [key]: next });
}
