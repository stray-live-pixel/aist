import type { AgentInstructionSource } from '../../../../types';
import type { BadgeTone } from '../../../../ui';
import type { SettingsPageId } from '../types';

/**
 * Что это: компактная модель одного навыка из источника инструкций skills.
 * Зачем нужно: обзор показывает каждый доступный навык отдельной понятной карточкой, а не одной длинной строкой prompt.
 * Какую продуктовую проблему решает: пользователь быстро видит, какие дополнительные действия доступны агенту.
 */
export type InstructionSourceSkillViewModel = {
  id: string;
  label: string;
  description: string;
};

/**
 * Что это: понятная для пользователя модель строки источника инструкций.
 * Зачем нужно: технические поля prompt source вроде priority/source нельзя показывать без объяснения.
 * Какую продуктовую проблему решает: пользователь видит, что именно получит агент, почему это важно и где это изменить.
 */
export type InstructionSourceViewModel = {
  id: string;
  kind: AgentInstructionSource['kind'];
  title: string;
  typeLabel: string;
  shortDescription: string;
  fullDescription: string;
  originLabel?: string;
  content: string;
  preview: string;
  badgeTone: BadgeTone;
  canOpenFullText: boolean;
  isLong: boolean;
  settingsPage: SettingsPageId;
  settingsActionLabel: string;
  skills: InstructionSourceSkillViewModel[];
};
