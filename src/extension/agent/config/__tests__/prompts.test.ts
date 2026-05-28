import { describe, expect, it } from 'vitest';

import { type AgentLanguage, getSystemPrompt } from '../prompts';

const BASE_PROMPT_CHAR_BUDGET = 2400;

const CORE_INVARIANTS = [
  'All tool paths must be workspace-relative.',
  'Every tool call must include a concrete short reason in clear product language',
  'Use run_bash_script freely for project commands, tests, builds, diagnostics',
  'For workspace mutations, prefer previewable file-edit tools',
  'if shell is the better mutation path, say why standard edit tools are not suitable',
  'Treat edits as approval-aware',
  'Approval comments in tool results are high-priority user instructions',
  'Do not invent tool results, file contents, builds, or tests; only claim what actually happened.'
] as const;

/**
 * Эти тесты защищают system prompt как публичный контракт агента: регрессия здесь
 * сразу влияет на все модели, tool calls и пользовательские инструкции.
 */
describe('getSystemPrompt', () => {
  it.each<AgentLanguage>(['en', 'ru'])('snapshots the compact %s base prompt contract', (language) => {
    const prompt = getSystemPrompt({ language });

    expect(prompt).toMatchSnapshot();
    expectBasePromptContract(prompt, language);
    expect(prompt.length).toBeLessThanOrEqual(BASE_PROMPT_CHAR_BUDGET);
  });

  it('snapshots project instructions and custom skills without losing core rules', () => {
    const prompt = getSystemPrompt({
      language: 'en',
      instructions: [
        '## Project instruction: Repository standards',
        'Use workspace docs before changing behavior.',
        '',
        '## Project mode: Test maintainer',
        'Keep prompt tests focused and update snapshots only intentionally.'
      ].join('\n'),
      skills: [
        {
          id: 'release-notes',
          label: 'Release notes',
          description: 'Build changelog draft from git-safe inspection.'
        },
        {
          id: 'test-audit',
          label: 'Test audit',
          description: 'List focused tests for the changed layer.'
        }
      ]
    });

    expect(prompt).toMatchSnapshot();
    expectBasePromptContract(prompt, 'en');
    expect(prompt).toContain('## User instructions');
    expect(prompt).toContain('## Project instruction: Repository standards');
    expect(prompt).toContain('## Project mode: Test maintainer');
    expect(prompt).toContain('## Skills');
    expect(prompt).toContain('Use run_skill only for listed custom skills.');
    expect(prompt).toContain('- release-notes: Release notes - Build changelog draft from git-safe inspection.');
    expect(prompt).toContain('- test-audit: Test audit - List focused tests for the changed layer.');
    expect(prompt).toContain('Call run_skill with a listed skillId');
  });

  it('does not advertise run_skill when custom skills are absent', () => {
    const prompt = getSystemPrompt({ language: 'en' });

    expect(prompt).not.toContain('## Skills');
    expect(prompt).not.toContain('run_skill');
  });
});

function expectBasePromptContract(prompt: string, language: AgentLanguage): void {
  expect(prompt).toContain('## Identity');
  expect(prompt).toContain('## Workflow');
  expect(prompt).toContain('## Tool rules');
  expect(prompt).toContain('## Editing rules');
  expect(prompt).toContain('## Language');
  expect(prompt).toContain(getExpectedLanguageRule(language));

  for (const invariant of CORE_INVARIANTS) {
    expect(prompt).toContain(invariant);
  }
}

function getExpectedLanguageRule(language: AgentLanguage): string {
  return language === 'ru'
    ? 'Write final answers and every tool call "reason" and "nextStep" argument in Russian.'
    : 'Write final answers and every tool call "reason" and "nextStep" argument in English.';
}
