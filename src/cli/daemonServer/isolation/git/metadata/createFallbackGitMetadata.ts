import type { IsolationGitMetadata } from './IsolationGitMetadata';
import { createFallbackSubject } from './createFallbackSubject';
import { createFallbackSummary } from './createFallbackSummary';

/**
 * Что это: запасной commit/PR metadata без обращения к модели.
 * Зачем нужно: git finalizer не должен падать из-за недоступной auxiliary model.
 * Какую продуктовую проблему решает: isolated branch всё равно будет закоммичен и отправлен на review.
 */
export function createFallbackGitMetadata({
  prompt,
  fallbackAnswer,
  statusSummary,
  sessionId
}: {
  prompt: string;
  fallbackAnswer?: string;
  statusSummary: string;
  sessionId: string;
}): IsolationGitMetadata {
  const subject = createFallbackSubject({ prompt, fallbackAnswer, statusSummary });
  return {
    commitMessage: `${subject}\n\nAIST isolated session: ${sessionId}`,
    prTitle: subject,
    prBody: [
      '## Summary',
      '',
      createFallbackSummary({ prompt, fallbackAnswer, statusSummary }),
      '',
      '## Verification',
      '',
      '- See the isolated run artifact for verification notes.',
      '',
      `AIST isolated session: ${sessionId}`,
      ''
    ].join('\n'),
    generatedByModel: false
  };
}
