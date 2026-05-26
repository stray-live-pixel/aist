import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { discoverAutonomousDefinitions } from '../discovery';
import { createAutonomousEngineRegistry } from '../engines/registry';
import { runAutonomousFlow } from '../flow/orchestrator';
import { AutonomousSessionStore } from '../storage/sessionStore';

describe('runAutonomousFlow', () => {
  it('executes example flow in dry-run and writes session events', async () => {
    const workspaceRoot = path.resolve('.');
    const definitions = await discoverAutonomousDefinitions({ workspaceRoot });
    const flow = definitions.flows.find((candidate) => candidate.id === 'example');
    expect(flow).toBeDefined();

    const tempWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'aist-autonomous-'));
    const store = new AutonomousSessionStore(tempWorkspace);
    const result = await runAutonomousFlow({
      flow: flow!,
      workspaceRoot: tempWorkspace,
      workDir: tempWorkspace,
      launch: { engineId: 'dry-run', dryRun: true },
      sessionStore: store,
      engineRegistry: createAutonomousEngineRegistry(),
      signal: new AbortController().signal
    });

    expect(result.state.status).toBe('finished');
    expect(result.state.stages.every((stage) => stage.status === 'done')).toBe(true);
    const session = await store.readSession(result.sessionId);
    expect(session.events.some((event) => event.action === 'DRY')).toBe(true);
  });
});
