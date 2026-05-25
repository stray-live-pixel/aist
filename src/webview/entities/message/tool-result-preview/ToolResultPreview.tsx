import { ChevronRight, Folder, ListTree, Terminal } from 'lucide-react';

import { useI18n } from '../../../shared/i18n';
import type { ChatMessage } from '../../../shared/types';
import { type FileReference, buildToolDisplayModel } from '../tool-message-model';
import { arrayValue, asRecord, asString, getToolPreview, getToolResult } from '../tool-value';
import { WorkspaceFileLink } from '../workspace-file-link';
import styles from './ToolResultPreview.module.scss';
import type { ToolResultPreviewProps } from './types';
import { getBashFacts, getLineCountLabel, getSecondaryFiles, getUniqueSearchFiles } from './utils';

const CODE_PREVIEW_LIMIT = 1200;
const LIST_PREVIEW_LIMIT = 24;

/**
 * Что это: человекочитаемый preview результата tool-call.
 * Зачем нужно: история чата остаётся компактной, а детали раскрываются кликом по карточке.
 * Пример: grep_search показывает только список файлов, чтобы не раздувать историю найденным текстом.
 */
export function ToolResultPreview({ message }: ToolResultPreviewProps) {
  const { t } = useI18n();
  const model = buildToolDisplayModel(message, t);
  const result = getToolResult(message);
  const preview = getToolPreview(message);
  const secondaryFiles = getSecondaryFiles(model.files, model.primaryFile);

  return (
    <div className={styles.root}>
      {message.reason ? <Reason text={message.reason} /> : null}
      {secondaryFiles.length ? <FileLinks files={secondaryFiles.slice(0, 12)} /> : null}
      {renderPrimaryResult(message, result, preview)}
    </div>
  );
}

function renderPrimaryResult(
  message: ChatMessage,
  result?: Record<string, unknown>,
  preview?: Record<string, unknown>
) {
  if (message.name === 'run_bash_script') return <BashScriptResult message={message} result={result} />;
  if (!result && preview) return <CompactFacts result={preview} />;
  if (!result) return null;
  if (asString(result.error)) return <ErrorText text={asString(result.error) || ''} />;

  if (message.name === 'read_file') return <CodePreview result={result} />;
  if (message.name === 'list_files') return <EntriesList result={result} />;
  if (message.name === 'grep_search') return <SearchFiles result={result} />;

  return <CompactFacts result={result} />;
}

function CodePreview({ result }: { result: Record<string, unknown> }) {
  const { t } = useI18n();
  const content = asString(result.content) || '';
  const isLong = content.length > CODE_PREVIEW_LIMIT;
  const preview = isLong ? `${content.slice(0, CODE_PREVIEW_LIMIT)}\n…` : content;

  return (
    <details className={styles.details} open={!isLong}>
      <summary>
        <ChevronRight size={13} />
        {t('tool.preview.code')} {Boolean(result.truncated) || isLong ? `· ${t('tool.preview.truncated')}` : ''}
      </summary>
      <pre className={styles.codePreview}>{preview || t('tool.preview.emptyFile')}</pre>
    </details>
  );
}

function EntriesList({ result }: { result: Record<string, unknown> }) {
  const { t } = useI18n();
  const entries = arrayValue(result.entries);
  const truncated = Boolean(result.truncated) || entries.length > LIST_PREVIEW_LIMIT;

  return (
    <ul className={styles.listPreview}>
      {entries.slice(0, LIST_PREVIEW_LIMIT).map(renderEntryItem)}
      {truncated ? <li className={styles.truncated}>{t('tool.preview.moreItems')}</li> : null}
    </ul>
  );
}

function SearchFiles({ result }: { result: Record<string, unknown> }) {
  const { t } = useI18n();
  const files = getUniqueSearchFiles(result);
  const truncated = Boolean(result.truncated) || files.length > LIST_PREVIEW_LIMIT;

  return (
    <ul className={`${styles.listPreview} ${styles.listVertical}`}>
      {files.slice(0, LIST_PREVIEW_LIMIT).map(renderSearchFile)}
      {truncated ? <li className={styles.truncated}>{t('tool.preview.moreFiles')}</li> : null}
    </ul>
  );
}

function BashScriptResult({ message, result }: { message: ChatMessage; result?: Record<string, unknown> }) {
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

function OutputBlock({ label, text, tone }: { label: string; text: string; tone: 'stdout' | 'stderr' }) {
  const { language, t } = useI18n();

  return (
    <details className={`${styles.details} ${styles.outputBlock} ${tone === 'stderr' ? styles.stderr : ''}`} open>
      <summary>
        <ChevronRight size={13} />
        <span>{label}</span>
        <em>{getLineCountLabel(text, language, t)}</em>
      </summary>
      <pre className={styles.codePreview}>{text}</pre>
    </details>
  );
}

function renderEntryItem(entry: unknown, index: number) {
  const item = asRecord(entry);
  const path = asString(item?.path) || `entry-${index}`;
  const type = asString(item?.type) || 'file';

  return (
    <li key={`${path}-${index}`}>
      <Folder size={13} />
      <span>{path}</span>
      <em>{type}</em>
    </li>
  );
}

function renderSearchFile(file: FileReference) {
  return (
    <li key={`${file.path}:${file.line || 0}:${file.column || 0}`}>
      <ListTree size={13} />
      <WorkspaceFileLink file={file} />
    </li>
  );
}

function FileLinks({ files }: { files: FileReference[] }) {
  return (
    <div className={styles.fileLinks}>
      {files.map((file) => (
        <WorkspaceFileLink key={`${file.path}:${file.line || 0}:${file.column || 0}`} file={file} />
      ))}
    </div>
  );
}

function CompactFacts({ result }: { result: Record<string, unknown> }) {
  const facts = Object.entries(result)
    .filter(([, value]) => typeof value !== 'object')
    .map(([key, value]) => `${key}: ${String(value)}`);

  return <p className={styles.compactFacts}>{facts.join(' · ')}</p>;
}

function Reason({ text }: { text: string }) {
  return <p className={styles.reason}>{text}</p>;
}

function ErrorText({ text }: { text: string }) {
  return <p className={styles.errorText}>{text}</p>;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
