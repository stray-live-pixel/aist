import type { AgentInstructionKind, AgentItemRef, AgentItemScope, AgentModeId } from '../../types';
import { post } from './post';

/**
 * Что это: действия prompt profile, modes, presets и инструкций.
 * Зачем нужно: prompt manager отправляет typed команды без знания IPC деталей.
 * Какую проблему решает: настройки инструкций развиваются отдельно от chat и model settings.
 */
export const promptActions = {
  setAgentMode(modeId: AgentModeId): void {
    post({ message: { type: 'setAgentMode', modeId } });
  },
  setAgentModeInstructions(modeId: AgentModeId, instructions: string): void {
    post({ message: { type: 'setAgentModeInstructions', modeId, instructions } });
  },
  setAgentConfigScope(scope: 'workspace' | 'user'): void {
    post({ message: { type: 'setAgentConfigScope', scope } });
  },
  setProjectInstructions(instructions: string): void {
    post({ message: { type: 'setProjectInstructions', instructions } });
  },
  addAgentMode(label: string, instructions: string): void {
    post({ message: { type: 'addAgentMode', label, instructions } });
  },
  deleteAgentMode(modeId: string): void {
    post({ message: { type: 'deleteAgentMode', modeId } });
  },
  upsertPromptItem(payload: {
    scope: AgentItemScope;
    kind: AgentInstructionKind;
    id?: string;
    label: string;
    content: string;
  }): void {
    post({ message: { type: 'upsertPromptItem', ...payload } });
  },
  duplicatePromptItem(scope: AgentItemScope, kind: AgentInstructionKind, id: string): void {
    post({ message: { type: 'duplicatePromptItem', scope, kind, id } });
  },
  deletePromptItem(scope: AgentItemScope, kind: AgentInstructionKind, id: string): void {
    post({ message: { type: 'deletePromptItem', scope, kind, id } });
  },
  setActivePromptConfig(instructionRefs: AgentItemRef[], modeRef?: AgentItemRef, presetId?: string): void {
    post({ message: { type: 'setActivePromptConfig', instructionRefs, modeRef, presetId } });
  },
  applyPromptPreset(presetId: string): void {
    post({ message: { type: 'applyPromptPreset', presetId } });
  },
  upsertPromptPreset(payload: {
    id?: string;
    label: string;
    instructionRefs: AgentItemRef[];
    modeRef?: AgentItemRef;
    scope?: AgentItemScope;
  }): void {
    post({ message: { type: 'upsertPromptPreset', ...payload } });
  },
  deletePromptPreset(presetId: string): void {
    post({ message: { type: 'deletePromptPreset', presetId } });
  }
};
