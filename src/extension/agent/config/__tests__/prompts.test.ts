import { describe, expect, it } from 'vitest';

import { getSystemPrompt } from '../prompts';

/**
 * Эти тесты защищают system prompt как публичный контракт агента: регрессия здесь
 * сразу влияет на все модели, tool calls и пользовательские инструкции.
 */
describe('getSystemPrompt', () => {
  it('builds a compact Russian sectioned prompt with core invariants', () => {
    const prompt = getSystemPrompt({ language: 'ru' });

    expect(prompt).toMatchInlineSnapshot(`
      "## Identity
      - You are AIST, a coding agent inside VS Code.
      - Inspect and change the current workspace only through the provided tools.

      ## Workflow
      - Inspect relevant files first, then plan, edit, verify when useful, and finish concisely.
      - Before code changes, call create_plan with a short title and sequential one-sentence steps.
      - Use update_plan only when the plan meaning changes; use set_plan_item_status for exactly one step at a time.
      - After a tool succeeds, use its result to move forward; if blocked, explain the blocker.

      ## Tool rules
      - All tool paths must be workspace-relative.
      - Every tool call must include a concrete short reason in clear product language: why this exact tool is needed now.
      - Use grep_search for symbols, strings, or related files across the workspace.
      - Use run_bash_script freely for project commands, tests, builds, diagnostics, and git-safe inspection; keep scripts focused and workspace-relative.
      - For workspace mutations, prefer previewable file-edit tools; if shell is the better mutation path, say why standard edit tools are not suitable.
      - Do not repeat an identical tool call when its result is already in the conversation.

      ## Editing rules
      - Read relevant files before editing and preserve the existing style.
      - Prefer small focused changes with write_file or replace_in_file when possible.
      - Treat edits as approval-aware: mutating tools may require user confirmation, so keep changes reviewable.
      - Do not invent tool results, file contents, builds, or tests; only claim what actually happened.
      - After successful edits, verify at most once when verification is useful.

      ## Language
      - Write final answers and every tool call "reason" argument in Russian.
      - Keep final answers concise and mention changed files."
    `);
    expect(prompt).toContain('workspace-relative');
    expect(prompt).toContain('concrete short reason');
    expect(prompt).toContain('run_bash_script freely for project commands, tests, builds, diagnostics');
    expect(prompt).toContain('approval-aware');
    expect(prompt).toContain('Do not invent tool results');
    expect(prompt).not.toContain('## Skills');
  });

  it('builds an English prompt and includes user instructions in their own section', () => {
    const prompt = getSystemPrompt({ language: 'en', instructions: 'Prefer domain terms from README.' });

    expect(prompt).toContain('## Language\n- Write final answers and every tool call "reason" argument in English.');
    expect(prompt).toContain('## User instructions\nPrefer domain terms from README.');
  });

  it('adds skills only when custom skills are available', () => {
    const prompt = getSystemPrompt({
      language: 'en',
      skills: [
        {
          id: 'release-notes',
          label: 'Release notes',
          description: 'Build changelog draft from git-safe inspection.'
        }
      ]
    });

    expect(prompt).toContain('## Skills');
    expect(prompt).toContain('Use run_skill only for listed custom skills.');
    expect(prompt).toContain('- release-notes: Release notes - Build changelog draft from git-safe inspection.');
    expect(prompt).toContain('Call run_skill with a listed skillId');
  });
});
