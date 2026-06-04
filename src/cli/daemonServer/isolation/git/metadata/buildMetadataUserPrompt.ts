import { truncateText } from '../utils/truncateText';

/**
 * Что это: user prompt с задачей, ответом агента и git diff для генерации metadata.
 * Зачем нужно: модель должна видеть реальные изменения и финальные notes агента.
 * Какую продуктовую проблему решает: PR title/commit message описывают сделанную работу, а не случайный кусок prompt.
 */
export function buildMetadataUserPrompt({
  prompt,
  fallbackAnswer,
  diffSummary,
  statusSummary,
  sessionId
}: {
  prompt: string;
  fallbackAnswer?: string;
  diffSummary: string;
  statusSummary: string;
  sessionId: string;
}): string {
  return [
    `Session id: ${sessionId}`,
    '',
    'User task:',
    truncateText({ value: prompt, maxLength: 4000 }),
    '',
    'Agent final answer:',
    truncateText({ value: fallbackAnswer || '(empty)', maxLength: 4000 }),
    '',
    'Changed files:',
    statusSummary || '(unknown)',
    '',
    'Git diff summary:',
    truncateText({ value: diffSummary, maxLength: 16000 })
  ].join('\n');
}
