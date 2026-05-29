import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Что это: пишет настройки VS Code workspace для e2e AIST.
 * Зачем нужно: UI и ответы агента становятся русскими, а tool permissions детерминированно разрешают read-only инструменты.
 */
export async function writeWorkspaceSettings({ workspacePath }: { workspacePath: string }): Promise<void> {
  await fs.mkdir(path.join(workspacePath, '.vscode'), { recursive: true });
  await fs.writeFile(
    path.join(workspacePath, '.vscode', 'settings.json'),
    JSON.stringify(
      {
        'workbench.colorTheme': 'Default Dark Modern',
        'openrouterAgent.language': 'ru',
        'openrouterAgent.model': 'openai/gpt-4o-mini',
        'openrouterAgent.streamingEnabled': false,
        'openrouterAgent.maxToolIterations': 4,
        'openrouterAgent.toolPermissions': {
          get_workspace_info: 'auto',
          list_files: 'auto',
          read_file: 'auto',
          read_file_range: 'auto',
          grep_search: 'auto',
          set_plan_item_status: 'auto',
          run_bash_script: 'ask',
          write_file: 'ask',
          replace_in_file: 'ask',
          create_directory: 'ask',
          delete_path: 'ask',
          create_plan: 'ask',
          update_plan: 'ask'
        }
      },
      null,
      2
    ),
    'utf8'
  );
}
