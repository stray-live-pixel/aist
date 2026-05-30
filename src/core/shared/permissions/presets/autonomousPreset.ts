import type { ToolPermissionPreset } from '../types';

/**
 * Что это: пресет автономной работы агента.
 * Зачем нужно: агент выполняет весь доступный набор инструментов автоматически для сценариев без ручного подтверждения.
 */
export const autonomousPreset: ToolPermissionPreset = {
  id: 'autonomous',
  label: 'Autonomous',
  description: 'Run every available tool automatically.',
  permissions: {
    get_workspace_info: 'auto',
    list_files: 'auto',
    read_file: 'auto',
    read_file_range: 'auto',
    grep_search: 'auto',
    run_bash_script: 'auto',
    write_file: 'auto',
    replace_in_file: 'auto',
    create_directory: 'auto',
    delete_path: 'auto',
    create_plan: 'auto',
    update_plan: 'auto',
    set_plan_item_status: 'auto',
    run_skill: 'auto'
  }
};
