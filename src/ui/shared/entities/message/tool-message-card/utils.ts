import type { ToolTone } from '../tool-message-model/types';

/**
 * Что это: маппинг ToolTone на CSS-модульный класс.
 * Зачем нужно: каждый тон устанавливает CSS-переменные --tool-tone и --tool-tone-strong.
 */
export const TONE_CLASS_MAP: Record<ToolTone, string> = {
  blue: 'toneBlue',
  green: 'toneGreen',
  purple: 'tonePurple',
  amber: 'toneAmber',
  rose: 'toneRose',
  cyan: 'toneCyan',
  slate: 'toneSlate'
};
