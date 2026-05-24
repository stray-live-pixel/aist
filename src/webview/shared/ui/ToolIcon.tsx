import {
  FilePenLine,
  FileText,
  FolderPlus,
  FolderTree,
  Info,
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
      return <FileText size={size} className={className} />;
    case 'grep_search':
      return <Search size={size} className={className} />;
    case 'run_bash_script':
      return <Terminal size={size} className={className} />;
    case 'write_file':
      return <FilePenLine size={size} className={className} />;
    case 'replace_in_file':
      return <Replace size={size} className={className} />;
    case 'create_directory':
      return <FolderPlus size={size} className={className} />;
    case 'delete_path':
      return <Trash2 size={size} className={className} />;
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
    case 'grep_search':
      return 'Search repository';
    case 'run_bash_script':
      return 'Run Bash script';
    case 'write_file':
      return 'Write file';
    case 'replace_in_file':
      return 'Replace in file';
    case 'create_directory':
      return 'Create directory';
    case 'delete_path':
      return 'Delete path';
    default:
      return name || 'Tool call';
  }
}
