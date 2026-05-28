import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { runAutonomousBatch } from '../batch/runBatch';
import { createAutonomousEngineRegistry } from '../engines/registry';
import { AutonomousSessionStore } from '../storage/sessionStore';
import type { AutonomousDefinitions, AutonomousFlowDefinition, AutonomousRunDefinition } from '../types';

function createFlow(): AutonomousFlowDefinition {
  return {
    id: 'sample-flow',
    title: 'Sample flow',
    description: '',
    body: '',
    stages: [
      {
        index: 1,
        file: '1.md',
        title: 'One',
        body: 'Do work',
        contexts: [],
        sourcePath: '1.md'
      }
    ],
    sourceKind: 'native',
    sourcePath: 'flow',
    diagnostics: []
  };
}

describe('runAutonomousBatch', () => {
  it('moves task from issues to done only after successful non-dry run', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aist-batch-'));
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aist-batch-home-'));
    const runRoot = path.join(workspaceRoot, '.aist-agent', 'autonomous', 'runs', 'sample-run');
    await fs.mkdir(path.join(runRoot, 'issues'), { recursive: true });
    await fs.writeFile(path.join(runRoot, 'issues', 'task.md'), '# Task', 'utf8');

    const run: AutonomousRunDefinition = {
      id: 'sample-run',
      title: 'Sample run',
      workDir: workspaceRoot,
      repeat: 1,
      tasks: [
        {
          index: 1,
          taskPath: 'issues/task.md',
          flowId: 'sample-flow',
          repeat: 1,
          body: '# Task',
          sourcePath: path.join(runRoot, 'issues', 'task.md')
        }
      ],
      sourceKind: 'native',
      sourcePath: runRoot,
      diagnostics: []
    };
    const definitions: AutonomousDefinitions = { flows: [createFlow()], runs: [run], diagnostics: [] };
    const result = await runAutonomousBatch({
      run,
      definitions,
      workspaceRoot,
      launch: { engineId: 'dry-run', dryRun: false },
      sessionStore: new AutonomousSessionStore(workspaceRoot, { homeDir }),
      engineRegistry: createAutonomousEngineRegistry(),
      signal: new AbortController().signal
    });

    expect(result.state.status).toBe('finished');
    expect(result.state.tasks[0]?.movedPath).toBe('done/task.md');
    await expect(fs.readFile(path.join(runRoot, 'done', 'task.md'), 'utf8')).resolves.toBe('# Task');
    await expect(fs.access(path.join(runRoot, 'issues', 'task.md'))).rejects.toThrow();
  });
});
