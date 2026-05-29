import type { AgentLanguage } from '../prompts';
import type { AgentSystemPromptSkill } from '../systemPrompt';

/** Где хранится элемент prompt-настроек: глобально у пользователя или локально в проекте. */
export type FilePromptItemScope = 'global' | 'local';

/** Ссылка на инструкцию или роль без дублирования её текста в активном preset. */
export type FilePromptItemRef = {
  scope: FilePromptItemScope;
  id: string;
};

/** Нормализованная дополнительная инструкция, которую пользователь может включить в system prompt. */
export type FilePromptInstruction = {
  id: string;
  label: string;
  content: string;
  scope: FilePromptItemScope;
};

/** Нормализованная роль агента: основной поведенческий режим, который добавляется после инструкций. */
export type FilePromptMode = {
  id: string;
  label: string;
  instructions: string;
  scope: FilePromptItemScope;
};

/** Набор ссылок на инструкции и роль, который пользователь выбирает одним пресетом. */
export type FilePromptPreset = {
  id: string;
  label: string;
  instructionRefs: FilePromptItemRef[];
  modeRef?: FilePromptItemRef;
  scope: FilePromptItemScope;
};

/** Полная prompt-конфигурация после чтения user/workspace settings и удаления битых ссылок. */
export type FilePromptConfig = {
  globalInstructions: FilePromptInstruction[];
  localInstructions: FilePromptInstruction[];
  globalModes: FilePromptMode[];
  localModes: FilePromptMode[];
  presets: FilePromptPreset[];
  activeInstructionRefs: FilePromptItemRef[];
  activeModeRef?: FilePromptItemRef;
  activePresetId?: string;
};

/** Сырая JSON-форма settings.json: поля ещё не проверены и могут быть любыми. */
export type StoredAgentConfig = {
  instructions?: unknown;
  modes?: unknown;
  presets?: unknown;
  activeInstructionRefs?: unknown;
  activeModeRef?: unknown;
  activePresetId?: unknown;
};

/** Входные данные для сборки финального system prompt из файловой конфигурации. */
export type BuildFileAgentSystemPromptParams = {
  workspaceRoot: string;
  homeDir?: string;
  language: AgentLanguage;
  skills?: AgentSystemPromptSkill[];
};

/** Входные данные для получения диагностируемого списка источников prompt-инструкций. */
export type GetFileAgentInstructionSourcesParams = {
  workspaceRoot: string;
  homeDir?: string;
  skills?: AgentSystemPromptSkill[];
};
