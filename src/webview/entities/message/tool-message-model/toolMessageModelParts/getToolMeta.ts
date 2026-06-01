import { type ToolTone } from '../types';
import { TOOL_META } from './TOOL_META';
import { Translator } from './Translator';

export function getToolMeta(name: string | undefined, t: Translator): { action: string; tone: ToolTone } {
  const meta = TOOL_META[name || ''];
  return meta
    ? { action: t(meta.actionKey), tone: meta.tone }
    : { action: name || t('tool.action.fallback'), tone: 'slate' };
}
