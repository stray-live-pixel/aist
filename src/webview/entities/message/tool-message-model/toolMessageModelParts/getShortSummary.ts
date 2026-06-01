import { type ChatMessage } from '../../../../shared/types';
import { arrayValue, asString, getToolResult } from '../../tool-value';
import { Translator } from './Translator';
import { getBashSummary } from './getBashSummary';
import { getMemoryNoteCount } from './getMemoryNoteCount';
import { getPlanStatusLabel } from './getPlanStatusLabel';

export function getShortSummary(message: ChatMessage, t: Translator): string {
  const result = getToolResult(message);
  if (!result && message.name === 'run_bash_script')
    return t('tool.summary.cwd', { cwd: asString(message.args?.cwd) || '.' });
  if (!result && message.name === 'run_skill')
    return t('tool.summary.skill', { skill: asString(message.args?.skillId) || '' }).trim();
  if (!result) return message.status || t('message.tool').toLowerCase();
  if (result.decision === 'denied') return asString(result.comment) || t('tool.status.denied');
  if (asString(result.error)) return asString(result.error) || t('tool.summary.toolError');
  if (message.name === 'get_relevant_memory') {
    return t('tool.summary.memoryNotes', { count: getMemoryNoteCount(result) });
  }
  if (message.name === 'grep_search') {
    const count = typeof result.totalMatches === 'number' ? result.totalMatches : arrayValue(result.matches).length;
    return t('tool.summary.matches', { count });
  }
  if (message.name === 'run_bash_script') return getBashSummary(result, t);
  if (message.name === 'run_skill') return getBashSummary(result, t);
  if (message.name === 'compact_chat') {
    const chatId = asString(result.chatId);
    return chatId ? t('tool.summary.newChat', { chatId }) : t('tool.summary.compacted');
  }
  if (message.name === 'create_plan' || message.name === 'update_plan') {
    return t('tool.summary.planItems', { count: Number(result.itemCount || 0) });
  }
  if (message.name === 'set_plan_item_status') {
    return t('tool.summary.planStatus', {
      index: Number(result.itemIndex || message.args?.itemIndex || 0),
      status: getPlanStatusLabel(asString(result.status) || asString(message.args?.status) || '', t)
    });
  }
  if (message.name === 'list_files') return t('tool.summary.entries', { count: arrayValue(result.entries).length });
  if (message.name === 'replace_in_file')
    return t('tool.summary.replacements', { count: Number(result.replacements || 0) });
  if (message.name === 'write_file' && typeof result.bytes === 'number')
    return t('tool.summary.bytes', { count: result.bytes });
  return message.status || t('message.tool').toLowerCase();
}
