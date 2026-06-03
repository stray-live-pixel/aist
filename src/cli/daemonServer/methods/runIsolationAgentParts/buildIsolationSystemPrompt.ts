import type { IsolationAgentRunInput } from '../../isolation/IsolationSessionManager';

/**
 * Что это: добавляет к обычному system prompt правила isolated-сессии.
 * Зачем нужно: агент в Docker должен работать только в worktree и отдавать результат через daemon finalizer.
 * Какую продуктовую проблему решает: каждый isolated run становится безопасным, проверяемым и готовым к review человеком.
 */
export function buildIsolationSystemPrompt(input: IsolationAgentRunInput): string {
  return [
    'Isolated autonomous run instructions:',
    `- Work only inside the isolated git worktree: ${input.worktreePath}.`,
    '- Bash commands are executed inside the Docker container with /workspace mounted to that worktree.',
    '- Do not modify the original user workspace outside this worktree.',
    '- Do not create commits, push branches, or create pull requests manually; the daemon finalizer will do that.',
    '- Keep every isolated-agent PR small, simple, and complete so a human can review it confidently.',
    '- If the user gives a large or complex task, first decompose it into simple finished subtasks and create a plan that shows their execution order.',
    '- Then execute the decomposed subtasks iteratively in a loop: start one subtask, inspect/edit/verify it, commit it, mark it done, and only then move to the next subtask.',
    '- If independent subtasks can be researched in parallel, use spawn_agent or other parallel-safe tools for investigation, but apply code changes in the main isolated worktree.',
    '- Prefer parallel isolated-agent PRs when independent subtasks can be completed without sharing files or ordering constraints; otherwise complete them sequentially as separate small PRs or separate checkpoint commits in this run.',
    '- After each completed subtask with file changes, call create_isolation_commit with a clear subtask title and summary before starting the next subtask.',
    '- If a subtask has no file changes, explicitly report that and continue to the next subtask without creating an empty commit.',
    `- Always create or update a reviewable markdown artifact at docs/aist-isolated-runs/${input.session.sessionId}.md.`,
    '- If the user asks a question or asks for analysis instead of code changes, write the complete answer into that markdown artifact.',
    '- If you implement code changes, also update that markdown artifact with a short summary and verification notes.',
    '- The isolated run is considered incomplete until at least one file is changed.',
    '- When implementation is complete, provide a concise summary of changed behavior and any verification you performed.',
    `- Current branch: ${input.session.branchName}.`
  ].join('\n');
}
