import type { ToolPermissionPreset } from '../types';

/**
 * Что это: пресет быстрого редактирования.
 * Зачем нужно: агент может сам читать, создавать и редактировать файлы, а также запускать навыки без лишних подтверждений.
 */
export const fastEditPreset: ToolPermissionPreset = {
  id: 'fast-edit',
  label: 'Fast edit',
  description: 'Read, search, create, edit, and run skills automatically; ask before shell commands and deletion.',
  permissions: {
    get_workspace_info: 'auto',
    list_files: 'auto',
    read_file: 'auto',
    read_file_range: 'auto',
    grep_search: 'auto',
    run_bash_script: 'ask',
    write_file: 'auto',
    replace_in_file: 'auto',
    create_directory: 'auto',
    delete_path: 'ask',
    create_plan: 'ask',
    update_plan: 'ask',
    set_plan_item_status: 'auto',
    run_skill: 'auto'
  }
};
