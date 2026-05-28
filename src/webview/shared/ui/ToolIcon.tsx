import {
  FilePenLine,
  FileText,
  FolderPlus,
  FolderTree,
  GitCompareArrows,
  Info,
  ListChecks,
  PlayCircle,
  Replace,
  Search,
  Terminal,
  Trash2,
  Wrench
} from 'lucide-react';

type ToolIconProps = {
  name?: string;
  size?: number;
  className?: string;
};

export function ToolIcon({ name, size = 16, className }: ToolIconProps) {
  switch (name) {
    case 'get_workspace_info':
      return <Info size={size} className={className} />;
    case 'list_files':
      return <FolderTree size={size} className={className} />;
    case 'read_file':
    case 'read_file_range':
      return <FileText size={size} className={className} />;
    case 'grep_search':
      return <Search size={size} className={className} />;
    case 'run_bash_script':
      return <Terminal size={size} className={className} />;
    case 'write_file':
      return <FilePenLine size={size} className={className} />;
    case 'replace_in_file':
      return <Replace size={size} className={className} />;
    case 'apply_patch':
      return <GitCompareArrows size={size} className={className} />;
    case 'create_directory':
      return <FolderPlus size={size} className={className} />;
    case 'delete_path':
      return <Trash2 size={size} className={className} />;
    case 'run_skill':
      return <PlayCircle size={size} className={className} />;
    case 'create_plan':
    case 'update_plan':
    case 'set_plan_item_status':
      return <ListChecks size={size} className={className} />;
    default:
      return <Wrench size={size} className={className} />;
  }
}

export function getToolLabel(name?: string): string {
  switch (name) {
    case 'get_workspace_info':
      return 'Workspace info';
    case 'list_files':
      return 'List files';
    case 'read_file':
      return 'Read file';
    case 'read_file_range':
      return 'Read file range';
    case 'grep_search':
      return 'Search repository';
    case 'run_bash_script':
      return 'Run Bash script';
    case 'write_file':
      return 'Write file';
    case 'replace_in_file':
      return 'Replace in file';
    case 'apply_patch':
      return 'Apply patch';
    case 'create_directory':
      return 'Create directory';
    case 'delete_path':
      return 'Delete path';
    case 'run_skill':
      return 'Run skill';
    case 'create_plan':
      return 'Create plan';
    case 'update_plan':
      return 'Update plan';
    case 'set_plan_item_status':
      return 'Update plan item';
    default:
      return name || 'Tool call';
  }
}
