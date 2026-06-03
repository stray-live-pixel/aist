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
    '- If a task is complex or needs multiple iterations, decompose it into simple finished subtasks; prefer parallel isolated-agent PRs when independent, otherwise complete them sequentially as separate small PRs.',
    `- Always create or update a reviewable markdown artifact at docs/aist-isolated-runs/${input.session.sessionId}.md.`,
    '- If the user asks a question or asks for analysis instead of code changes, write the complete answer into that markdown artifact.',
    '- If you implement code changes, also update that markdown artifact with a short summary and verification notes.',
    '- The isolated run is considered incomplete until at least one file is changed.',
    '- When implementation is complete, provide a concise summary of changed behavior and any verification you performed.',
    `- Current branch: ${input.session.branchName}.`
  ].join('\n');
}
