import { describe, expect, it } from 'vitest';

import { type TranslationKey, translate } from '../../shared/i18n';
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
});
