import { describe, expect, it } from 'vitest';

import { type TranslationKey, translate } from '../../../shared/i18n';
import { buildToolDisplayModel } from './toolMessageModel';

const t = (key: TranslationKey, values?: Record<string, string | number>) => translate('en', key, values);

describe('toolMessageModel', () => {
  it('uses the bash script as the run_bash_script display target', () => {
    expect(
      buildToolDisplayModel(
        {
          id: 'tool-bash',
          role: 'tool',
          name: 'run_bash_script',
          status: 'running',
          args: {
            script: 'npm run test -- --run src/webview/entities/message/toolValue.test.ts',
            cwd: '.'
          },
          createdAt: 0
        },
        t
      )
    ).toMatchObject({
      action: 'RUN BASH',
      title: 'RUN BASH: npm run test -- --run src/webview/entities/message/toolValue.test.ts',
      summary: 'cwd .'
    });
  });

  it('summarizes completed bash calls with exit code and duration', () => {
    expect(
      buildToolDisplayModel(
        {
          id: 'tool-bash',
          role: 'tool',
          name: 'run_bash_script',
          status: 'done',
          args: { script: 'npm run typecheck' },
          result: {
            ok: true,
            exitCode: 0,
            durationMs: 1530
          },
          createdAt: 0
        },
        t
      ).summary
    ).toBe('exit 0 · 1.5s');
  });

  it('summarizes grep_search by totalMatches when compact results are returned', () => {
    expect(
      buildToolDisplayModel(
        {
          id: 'tool-grep',
          role: 'tool',
          name: 'grep_search',
          status: 'done',
          args: { query: 'target' },
          result: {
            ok: true,
            totalMatches: 3,
            matches: [
              { path: 'src/one.ts', count: 2 },
              { path: 'src/two.ts', count: 1 }
            ]
          },
          createdAt: 0
        },
        t
      ).summary
    ).toBe('3 matches');
  });

  it('summarizes applied memory tool calls as visible memory notes', () => {
    expect(
      buildToolDisplayModel(
        {
          id: 'tool-memory',
          role: 'tool',
          name: 'get_relevant_memory',
          status: 'done',
          args: { query: 'current user request' },
          result: {
            ok: true,
            source: 'user-approved-memory',
            notes: ['Relevant memory notes:', '- global: Prefer Russian answers', '- project: Run typecheck'].join('\n')
          },
          createdAt: 0
        },
        t
      )
    ).toMatchObject({
      action: 'MEMORY',
      title: 'MEMORY: relevant notes',
      summary: '2 memory notes'
    });
  });

  it('summarizes structured approval denials without treating them as normal tool results', () => {
    expect(
      buildToolDisplayModel(
        {
          id: 'tool-denied',
          role: 'tool',
          name: 'create_plan',
          status: 'denied',
          approval: 'denied',
          args: { title: 'Old plan' },
          result: {
            ok: false,
            decision: 'denied',
            comment: 'Revise the approach first.',
            continueAfterDeny: true,
            userApprovalComment: 'Revise the approach first.'
          },
          createdAt: 0
        },
        t
      ).summary
    ).toBe('Revise the approach first.');
  });
});
