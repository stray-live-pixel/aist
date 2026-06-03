import type { IsolationAgentRunInput } from '../IsolationSessionManager';

/**
 * Что это: добавляет container-specific инструкции к пользовательской задаче isolated агента.
 * Зачем нужно: в автономном контейнере агент запускается как headless CLI и должен сам работать только в /workspace.
 * Какую продуктовую проблему решает: удалённый/локальный Docker сценарий имеет один понятный рабочий контракт для агента.
 */
export function createContainerAgentPrompt({ input }: { input: IsolationAgentRunInput }): string {
  return [
    input.session.prompt,
    '',
    'Isolated autonomous run instructions:',
    '- Work only inside /workspace inside this autonomous Docker container.',
    '- The repository was cloned from GitHub inside the container; do not rely on any host-mounted files.',
    '- AIST CLI is installed in the container and this run is already on the target branch.',
    '- Do not create commits, push branches, or create pull requests manually; the daemon finalizer will do that after you finish.',
    `- Always create or update a reviewable markdown artifact at docs/aist-isolated-runs/${input.session.sessionId}.md.`,
    '- If the user asks a question or asks for analysis instead of code changes, write the complete answer into that markdown artifact.',
    '- If you implement code changes, also update that markdown artifact with a short summary and verification notes.',
    '- The isolated run is considered incomplete until at least one file is changed.',
    '- When implementation is complete, provide a concise summary of changed behavior and any verification you performed.',
    `- Current branch: ${input.session.branchName}.`
  ].join('\n');
}
