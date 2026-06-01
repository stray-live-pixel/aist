import { type AgentInstructionSource } from '../../../../core/features/system-prompt/systemPrompt';
import { DECLARATIVE_INSTRUCTION_FILES } from './DECLARATIVE_INSTRUCTION_FILES';
import { readDeclarativeInstructionFile } from './readDeclarativeInstructionFile';

export function getDeclarativeInstructionSources(): AgentInstructionSource[] {
  return DECLARATIVE_INSTRUCTION_FILES.map((item) => readDeclarativeInstructionFile(item)).filter(
    (source): source is AgentInstructionSource => Boolean(source)
  );
}
