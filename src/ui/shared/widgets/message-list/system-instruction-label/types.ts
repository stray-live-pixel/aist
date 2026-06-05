import type { AgentInstructionSource, AgentMode, AgentPromptConfig } from '../../../shared/types';

/**
 * Что это: props кнопки активных системных инструкций.
 * Зачем нужно: MessageList передаёт фактические источники и promptConfig, а компонент сам решает,
 * как показать компактные chips и открыть редактор.
 */
export type SystemInstructionLabelProps = {
  mode: AgentMode | undefined;
  sources: AgentInstructionSource[];
  promptConfig: AgentPromptConfig;
  busy?: boolean;
};

/**
 * Что это: props модального окна управления инструкциями.
 * Зачем нужно: dialog отделён от кнопки, потому что рендерится через portal и имеет собственное поведение закрытия.
 */
export type SystemInstructionDialogProps = {
  title: string;
  promptConfig: AgentPromptConfig;
  onClose(): void;
};
