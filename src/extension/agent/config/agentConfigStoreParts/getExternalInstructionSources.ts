import { type AgentInstructionSource } from '../../../../core/features/system-prompt/systemPrompt';
import { getDeclarativeInstructionSources } from './getDeclarativeInstructionSources';
import { readInstructionFile } from './readInstructionFile';

export function getExternalInstructionSources(): AgentInstructionSource[] {
  return [
    readInstructionFile('AGENTS.md', 20),
    readInstructionFile('CLAUDE.md', 30),
    ...getDeclarativeInstructionSources()
  ]
    .filter((source): source is AgentInstructionSource => Boolean(source))
    .sort((left, right) => left.priority - right.priority);
}
