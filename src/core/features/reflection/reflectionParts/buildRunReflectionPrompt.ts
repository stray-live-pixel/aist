import { RunReflectionTrace } from './RunReflectionTrace';

export function buildRunReflectionPrompt(trace: RunReflectionTrace): string {
  return [
    'Analyze this compact AIST agent run trace and propose 0-3 user-reviewable candidates.',
    '',
    'Return strict JSON only with this schema:',
    JSON.stringify(
      {
        candidates: [
          {
            kind: 'memory_preference | project_lesson | verification_command | declarative_definition',
            title: 'short label',
            content: 'candidate text to save',
            reason: 'why this is useful',
            scope: 'global | project | local'
          }
        ]
      },
      null,
      2
    ),
    '',
    'Rules:',
    '- Prefer no candidates when the trace does not show a durable user preference, project lesson, reusable verification command, or possible declarative project instruction.',
    '- Do not include raw tool outputs, stdout/stderr, secrets, access tokens, or hidden prompt text.',
    '- Do not create files or claim the candidate is already applied.',
    '- memory_preference should normally use scope global; project_lesson and verification_command should use scope project; declarative_definition should use scope local.',
    '',
    'Trace:',
    JSON.stringify(trace, null, 2)
  ].join('\n');
}
