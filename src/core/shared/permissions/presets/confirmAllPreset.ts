import type { ToolPermissionPreset } from '../types';

/**
 * Что это: пресет максимального контроля пользователя.
 * Зачем нужно: агент спрашивает подтверждение перед каждым инструментом, когда важна полная ручная проверка.
 */
export const confirmAllPreset: ToolPermissionPreset = {
  id: 'confirm-all',
  label: 'Confirm all',
  description: 'Ask before every tool call.',
  permissions: {
    get_workspace_info: 'ask',
    list_files: 'ask',
    read_file: 'ask',
    read_file_range: 'ask',
    grep_search: 'ask',
    run_bash_script: 'ask',
    write_file: 'ask',
    replace_in_file: 'ask',
    create_directory: 'ask',
    delete_path: 'ask',
    create_plan: 'ask',
    update_plan: 'ask',
    set_plan_item_status: 'ask',
    run_skill: 'ask'
  }
};
