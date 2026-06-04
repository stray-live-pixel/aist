import { describe, expect, it } from 'vitest';

import type { AuxiliaryModelInvoker } from '../../../../core/entities/model/auxiliaryModel';
import { createIsolationGitMetadata } from './createIsolationGitMetadata';
import { createFallbackGitMetadata } from './metadata';
import { normalizeGitMetadata } from './utils/normalizeGitMetadata';

/**
 * Что это: regression-тесты metadata для commit/PR isolated агента.
 * Зачем нужно: раньше title и commit message брались из обрезанного пользовательского prompt.
 * Какую продуктовую проблему решает: PR после detached run должен объяснять реальные изменения.
 */
describe('createIsolationGitMetadata', () => {
  it('использует JSON от auxiliary model для commit message и PR title', async () => {
    const auxiliaryModel: AuxiliaryModelInvoker = {
      invoke: async () => ({
        role: 'assistant',
        content: JSON.stringify({
          commitMessage: 'Improve isolated PR metadata',
          prTitle: 'Generate useful PR metadata for isolated agents',
          prBody: '## Summary\n\n- Uses diff-aware metadata\n\n## Verification\n\n- npm test'
        })
      })
    };

    const metadata = await createIsolationGitMetadata({
      auxiliaryModel,
      prompt: 'Доработай Isolated agents режим работы, чтобы при создании ПР агент придумывал нормальный commit message',
      fallbackAnswer: 'Implemented diff-aware metadata generation.',
      diffSummary: ' src/cli/daemonServer/isolation/git/IsolationGitService.ts | 20 ++++++++++++++',
      statusSummary: 'M src/cli/daemonServer/isolation/git/IsolationGitService.ts',
      sessionId: 'session-1'
    });

    expect(metadata.generatedByModel).toBe(true);
    expect(metadata.commitMessage).toBe('Improve isolated PR metadata\n\nAIST isolated session: session-1');
    expect(metadata.prTitle).toBe('Generate useful PR metadata for isolated agents');
    expect(metadata.prBody).toContain('Uses diff-aware metadata');
  });

  it('возвращает fallback, если auxiliary model недоступна или вернула невалидный JSON', async () => {
    const auxiliaryModel: AuxiliaryModelInvoker = {
      invoke: async () => ({ role: 'assistant', content: 'not-json' })
    };

    const metadata = await createIsolationGitMetadata({
      auxiliaryModel,
      prompt: 'Очень длинная пользовательская задача, которая раньше попадала в commit message напрямую',
      fallbackAnswer: 'Added readable PR metadata generation for isolated agents.',
      diffSummary: ' src/cli/daemonServer/isolation/git/createIsolationGitMetadata.ts | 50 +++++++++++++++++',
      statusSummary: 'A src/cli/daemonServer/isolation/git/createIsolationGitMetadata.ts',
      sessionId: 'session-2'
    });

    expect(metadata.generatedByModel).toBe(false);
    expect(metadata.commitMessage).toBe(
      'Added readable PR metadata generation for isolated agents\n\nAIST isolated session: session-2'
    );
    expect(metadata.prTitle).toBe('Added readable PR metadata generation for isolated agents');
  });
});

/**
 * Что это: unit-тест нормализации ответа модели.
 * Зачем нужно: модель может вернуть Markdown fence и слишком длинный subject.
 * Какую продуктовую проблему решает: git finalizer получает безопасный и читаемый результат.
 */
describe('normalizeGitMetadata', () => {
  it('достаёт JSON из fenced ответа и ограничивает длину subject/title', () => {
    const fallback = createFallbackGitMetadata({
      prompt: 'fallback prompt',
      statusSummary: 'M file.ts',
      sessionId: 'session-3'
    });

    const metadata = normalizeGitMetadata({
      fallback,
      rawText:
        '```json\n{"commitMessage":"' +
        'Update isolated agents with better generated pull request metadata and review-ready descriptions' +
        '","prTitle":"Improve isolated agents pull request metadata generation for clearer reviews","prBody":"## Summary\\n\\nDone\\n\\n## Verification\\n\\n- Typecheck"}\n```'
    });

    expect(metadata.generatedByModel).toBe(true);
    expect(metadata.commitMessage.split('\n')[0].length).toBeLessThanOrEqual(72);
    expect(metadata.prTitle.length).toBeLessThanOrEqual(90);
    expect(metadata.prBody).toContain('Typecheck');
  });
});
