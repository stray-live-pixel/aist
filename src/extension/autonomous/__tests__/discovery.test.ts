import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { discoverAutonomousDefinitions } from '../discovery';

describe('discoverAutonomousDefinitions', () => {
  it('reads native autonomous flows and runs without Python', async () => {
    const definitions = await discoverAutonomousDefinitions({ workspaceRoot: path.resolve('.') });

    expect(definitions.flows.map((flow) => flow.id)).toContain('example');
    expect(definitions.flows.map((flow) => flow.id)).toContain('create-edit-section');
    expect(definitions.flows.find((flow) => flow.id === 'example')?.stages).toHaveLength(4);
    expect(definitions.flows.find((flow) => flow.id === 'create-edit-section')?.defaultCodexModel).toBe('gpt-5.5');
    expect(definitions.runs.map((run) => run.id)).toContain('benefits-list-analysis');
  });
});
