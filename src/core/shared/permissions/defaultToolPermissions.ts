import type { ToolPermissionMode } from '../types/types';

/**
 * Что это: базовая карта разрешений инструментов агента.
 * Зачем нужно: это безопасный режим по умолчанию — читать можно автоматически, менять файлы и запускать shell только после подтверждения.
 */
export const DEFAULT_TOOL_PERMISSIONS: Record<string, ToolPermissionMode> = {
  get_workspace_info: 'auto',
  list_files: 'auto',
  read_file: 'auto',
  read_file_range: 'auto',
  grep_search: 'auto',
  run_bash_script: 'ask',
  write_file: 'ask',
  replace_in_file: 'ask',
  create_directory: 'ask',
  delete_path: 'ask',
  create_plan: 'ask',
  update_plan: 'ask',
  set_plan_item_status: 'auto',
  run_skill: 'ask'
};
