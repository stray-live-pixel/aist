import { Terminal } from 'lucide-react';

import { useI18n } from '../../../../i18n';
import { type ChatMessage } from '../../../../types';
import { asString } from '../../tool-value';
import styles from '../ToolResultPreview.module.scss';
import { getBashFacts } from '../utils';
import { ErrorText } from './ErrorText';
import { OutputBlock } from './OutputBlock';
import { capitalize } from './capitalize';

export function BashScriptResult({ message, result }: { message: ChatMessage; result?: Record<string, unknown> }) {
  const { t } = useI18n();
  const stdout = asString(result?.stdout) || '';
  const stderr = asString(result?.stderr) || '';
  const error = asString(result?.error);
  const command = asString(message.args?.script) || 'bash -lc';
  const facts = getBashFacts(message, result, t);
  const hasOutput = Boolean(stdout || stderr);
  const completedQuietly = Boolean(result && !error && !hasOutput);

  return (
    <div className={styles.bashPreview}>
      <div className={styles.bashCommand}>
        <div className={styles.bashCommandLabel}>
          <Terminal size={13} />
          <span>{t('common.command')}</span>
        </div>
        <pre className={styles.bashCommandPre}>
          <code>{command}</code>
        </pre>
      </div>
      <dl className={styles.bashFacts}>
        {facts.map((fact) => (
          <div key={fact.label} className={fact.tone ? styles[`fact${capitalize(fact.tone)}`] : undefined}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      {error ? <ErrorText text={error} /> : null}
      {!result ? <p className={styles.waitingOutput}>{t('tool.preview.waitingOutput')}</p> : null}
      {stdout ? (
        <OutputBlock
          label={`stdout${result?.stdoutTruncated ? ` · ${t('tool.preview.truncated')}` : ''}`}
          text={stdout}
          tone="stdout"
        />
      ) : null}
      {stderr ? (
        <OutputBlock
          label={`stderr${result?.stderrTruncated ? ` · ${t('tool.preview.truncated')}` : ''}`}
          text={stderr}
          tone="stderr"
        />
      ) : null}
      {completedQuietly ? <p className={styles.noOutput}>{t('tool.preview.noOutput')}</p> : null}
    </div>
  );
}
