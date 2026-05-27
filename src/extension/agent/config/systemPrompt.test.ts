import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentInstructionSource, AgentPromptConfig } from './agentConfigStore';
import { buildAgentSystemPrompt, getAgentInstructionSources } from './systemPrompt';

const mocks = vi.hoisted(() => ({
  externalSources: [] as AgentInstructionSource[],
  promptConfig: {
    globalInstructions: [],
    localInstructions: [],
    globalModes: [],
    localModes: [],
    presets: [],
    activeInstructionRefs: []
  } as AgentPromptConfig
}));

vi.mock('./agentConfigStore', () => {
  return {
    getExternalInstructionSources: () => mocks.externalSources,
    getPromptConfig: () => mocks.promptConfig
  };
});

vi.mock('./settings', () => ({
  getAgentLanguage: () => 'en'
}));

vi.mock('../../skills/skills', () => ({
  getAgentSkills: () => []
}));

beforeEach(() => {
  mocks.externalSources = [];
  mocks.promptConfig = {
    globalInstructions: [],
    localInstructions: [],
    globalModes: [],
    localModes: [],
    presets: [],
    activeInstructionRefs: []
  };
});

describe('system prompt declarative instructions', () => {
  it('snapshots declarative project instructions without losing immutable kernel rules', () => {
    mocks.externalSources = [
      {
        id: '.aist-agent/instructions/project.md',
        title: '.aist-agent project instructions',
        content: 'Prefer declarative project guidance before legacy config.',
        priority: 12,
        kind: 'declarative',
        source: '.aist-agent/instructions/project.md'
      },
      {
        id: '.aist-agent/policies/prompt-policy.md',
        title: '.aist-agent prompt policy',
        content: 'Keep prompt snapshots intentional.',
        priority: 14,
        kind: 'declarative',
        source: '.aist-agent/policies/prompt-policy.md'
      }
    ];

    const prompt = buildAgentSystemPrompt();

    expect(prompt).toMatchSnapshot();
    expect(prompt).toContain('## Identity');
    expect(prompt).toContain('## Tool rules');
    expect(prompt).toContain('## User instructions');
    expect(prompt).toContain('Source: .aist-agent/instructions/project.md');
    expect(prompt).toContain('Source: .aist-agent/policies/prompt-policy.md');
    expect(prompt).toContain('lower priority than the immutable AIST kernel');
  });

  it('orders declarative sources after the base source and before legacy instruction files', () => {
    mocks.externalSources = [
      { id: 'AGENTS.md', title: 'AGENTS.md', content: 'Legacy agents.', priority: 20, kind: 'file' },
      {
        id: '.aist-agent/instructions/project.md',
        title: '.aist-agent project instructions',
        content: 'Declarative instructions.',
        priority: 12,
        kind: 'declarative',
        source: '.aist-agent/instructions/project.md'
      }
    ];

    expect(getAgentInstructionSources().map((source) => source.id)).toEqual([
      'base',
      '.aist-agent/instructions/project.md',
      'AGENTS.md'
    ]);
  });
});
