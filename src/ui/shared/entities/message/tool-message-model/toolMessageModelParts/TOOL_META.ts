import { type ToolTone } from '../types';
import { Translator } from './Translator';

export const TOOL_META: Record<string, { actionKey: Parameters<Translator>[0]; tone: ToolTone }> = {
  get_workspace_info: { actionKey: 'tool.action.get_workspace_info', tone: 'slate' },
  get_relevant_memory: { actionKey: 'tool.action.get_relevant_memory', tone: 'purple' },
  list_files: { actionKey: 'tool.action.list_files', tone: 'blue' },
  read_file: { actionKey: 'tool.action.read_file', tone: 'green' },
  read_file_range: { actionKey: 'tool.action.read_file_range', tone: 'green' },
  grep_search: { actionKey: 'tool.action.grep_search', tone: 'purple' },
  run_bash_script: { actionKey: 'tool.action.run_bash_script', tone: 'slate' },
  run_skill: { actionKey: 'tool.action.run_skill', tone: 'green' },
  compact_chat: { actionKey: 'tool.action.compact_chat', tone: 'purple' },
  create_plan: { actionKey: 'tool.action.create_plan', tone: 'purple' },
  update_plan: { actionKey: 'tool.action.update_plan', tone: 'purple' },
  set_plan_item_status: { actionKey: 'tool.action.set_plan_item_status', tone: 'purple' },
  write_file: { actionKey: 'tool.action.write_file', tone: 'amber' },
  replace_in_file: { actionKey: 'tool.action.replace_in_file', tone: 'cyan' },
  create_directory: { actionKey: 'tool.action.create_directory', tone: 'blue' },
  delete_path: { actionKey: 'tool.action.delete_path', tone: 'rose' }
};
