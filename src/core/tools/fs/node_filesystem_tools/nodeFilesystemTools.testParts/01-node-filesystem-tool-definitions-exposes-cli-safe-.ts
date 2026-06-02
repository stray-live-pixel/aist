import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { nodeFilesystemTools, runNodeFilesystemTool } from '../nodeFilesystemTools';
import { run, workspaceRoot, writeWorkspaceFile } from './helpers';

describe('node filesystem tool definitions', () => {
  it('exposes CLI-safe filesystem tools without edit_file preview', () => {
    expect(nodeFilesystemTools.map((tool) => tool.function.name)).toEqual([
      'list_files',
      'read_file',
      'read_file_range',
      'grep_search',
      'run_bash_script',
      'write_file',
      'replace_in_file',
      'create_directory',
      'delete_path'
    ]);
    expect(nodeFilesystemTools.map((tool) => tool.function.name)).not.toContain('get_workspace_info');
    expect(nodeFilesystemTools.map((tool) => tool.function.name)).not.toContain('outline_file');
    expect(nodeFilesystemTools.map((tool) => tool.function.name)).not.toContain('edit_file');
    expect(nodeFilesystemTools.map((tool) => tool.function.name)).not.toContain('apply_patch');
    expect(nodeFilesystemTools.find((tool) => tool.function.name === 'grep_search')?.function.parameters).toMatchObject(
      {
        required: ['reason', 'nextStep', 'query'],
        properties: {
          filesOnly: { type: 'boolean' },
          countOnly: { type: 'boolean' },
          beforeLines: { type: 'number' },
          afterLines: { type: 'number' },
          exclude: { type: 'string' }
        }
      }
    );
  });
});
