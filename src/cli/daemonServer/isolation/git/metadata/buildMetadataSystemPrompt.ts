/**
 * Что это: system prompt для генерации git metadata isolated run.
 * Зачем нужно: auxiliary model должна вернуть короткий JSON, пригодный для git и GitHub CLI.
 * Какую продуктовую проблему решает: автоматически созданные PR получают человеческие title/body без ручной правки.
 */
export function buildMetadataSystemPrompt(): string {
  return [
    'You write Git metadata for autonomous coding-agent changes.',
    'Return strict JSON only with keys: commitMessage, prTitle, prBody.',
    'commitMessage must be a concise imperative Git subject, max 72 characters, no trailing period.',
    'prTitle must be a concise pull request title, max 90 characters, no trailing period.',
    'prBody must be Markdown with short Summary and Verification sections.',
    'Use the actual diff/status as the source of truth, not the user prompt wording.',
    'Do not include code fences, explanations, or extra JSON keys.'
  ].join('\n');
}
