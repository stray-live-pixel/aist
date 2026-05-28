import { describe, expect, it } from 'vitest';

import {
  buildAgentSystemPrompt,
  createBaseAgentInstructionSource,
  formatInstructionSourceForPrompt,
  sortAgentInstructionSources
} from './systemPrompt';

describe('core system prompt helpers', () => {
  it('formats declarative instruction sources with precedence metadata', () => {
    const formatted = formatInstructionSourceForPrompt({
      id: '.aist-agent/instructions/project.md',
      title: '.aist-agent project instructions',
      content: 'Prefer repository-local verification commands.',
      priority: 12,
      kind: 'declarative',
      source: '.aist-agent/instructions/project.md'
    });

    expect(formatted).toContain('## .aist-agent project instructions');
    expect(formatted).toContain('Source: .aist-agent/instructions/project.md');
    expect(formatted).toContain('lower priority than the immutable AIST kernel');
    expect(formatted).toContain('Prefer repository-local verification commands.');
  });

  it('sorts sources and builds a prompt without requiring extension config reads', () => {
    const prompt = buildAgentSystemPrompt({
      language: 'en',
      instructionSources: sortAgentInstructionSources([
        {
          id: 'project:mode:coder',
          title: 'Project mode: Coder',
          content: 'Use focused tests for changed core helpers.',
          priority: 80,
          kind: 'mode'
        },
        createBaseAgentInstructionSource()
      ]),
      skills: [{ id: 'release-notes', label: 'Release notes', description: 'Draft concise release notes.' }]
    });

    expect(prompt).toContain('## Identity');
    expect(prompt).toContain('## User instructions');
    expect(prompt).toContain('## Project mode: Coder');
    expect(prompt).toContain('Use focused tests for changed core helpers.');
    expect(prompt).toContain('- release-notes: Release notes - Draft concise release notes.');
  });
});
