import { type ToolPermissionItem } from '../../types';

export const storyToolPermissions: ToolPermissionItem[] = [
  {
    name: 'read_file',
    description: 'Read a workspace file and return a compact preview for the agent.',
    permission: 'auto',
    defaultPermission: 'auto'
  },
  {
    name: 'read_file_range',
    description: 'Read a bounded line range from a workspace file.',
    permission: 'auto',
    defaultPermission: 'auto'
  },
  {
    name: 'grep_search',
    description: 'Search the repository with ripgrep and show matching files.',
    permission: 'auto',
    defaultPermission: 'auto'
  },
  {
    name: 'run_bash_script',
    description: 'Run a shell command in the workspace.',
    permission: 'ask',
    defaultPermission: 'ask'
  },
  {
    name: 'replace_in_file',
    description: 'Replace a range or matching text inside an existing file.',
    permission: 'ask',
    defaultPermission: 'ask'
  }
];
