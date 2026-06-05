import { type ChatMessage } from '../../../../types';
import { asString, getToolPreview, getToolResult } from '../../tool-value';
import { Translator } from './Translator';
import { compactSingleLine } from './compactSingleLine';

export function getToolTarget(message: ChatMessage, t: Translator): string | undefined {
  if (message.name === 'get_relevant_memory') {
    return t('tool.target.memory');
  }

  if (message.name === 'run_bash_script') {
    return compactSingleLine(asString(message.args?.script));
  }

  if (message.name === 'run_skill') {
    return asString(message.args?.skillId) || asString(getToolResult(message)?.label);
  }

  if (message.name === 'compact_chat') {
    return asString(message.args?.trigger) || asString(getToolResult(message)?.chatId);
  }

  if (message.name === 'create_plan' || message.name === 'update_plan') {
    return asString(message.args?.title) || asString(getToolResult(message)?.title);
  }

  if (message.name === 'set_plan_item_status') {
    return t('tool.target.planItem', { index: String(message.args?.itemIndex || '') }).trim();
  }

  return (
    asString(message.args?.query) ||
    asString(message.args?.path) ||
    asString(getToolResult(message)?.path) ||
    asString(getToolPreview(message)?.path)
  );
}
