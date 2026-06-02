import { type ToolPermissionPreset } from '../../shared/types';

export const storyToolPermissionPresets: ToolPermissionPreset[] = [
  {
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
      delete_path: 'ask'
    }
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Read and search automatically; ask before shell commands and file changes.',
    permissions: {
      get_workspace_info: 'auto',
      list_files: 'auto',
      read_file: 'auto',
      read_file_range: 'auto',
      grep_search: 'auto',
      run_bash_script: 'ask',
      write_file: 'ask',
      replace_in_file: 'ask',
      create_directory: 'ask',
      delete_path: 'ask'
    }
  },
  {
    id: 'fast-edit',
    label: 'Fast edit',
    description: 'Read, search, create, and edit automatically; ask before shell commands and deletion.',
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
      delete_path: 'ask'
    }
  },
  {
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
      delete_path: 'auto'
    }
  }
];
