import { ChevronRight, Folder, ListTree, Terminal } from 'lucide-react';

import { pluralKey, useI18n } from '../../shared/i18n';
import type { ChatMessage } from '../../shared/types';
import { WorkspaceFileLink } from './WorkspaceFileLink';
import { type FileReference, buildToolDisplayModel } from './toolMessageModel';
import { arrayValue, asRecord, asString, getToolPreview, getToolResult } from './toolValue';

const CODE_PREVIEW_LIMIT = 1200;
const LIST_PREVIEW_LIMIT = 24;

/**
 * Что это: человекочитаемый preview результата tool-call.
 * Зачем нужно: история чата остаётся компактной, а детали раскрываются кликом по карточке.
 * Пример: grep_search показывает только список файлов, чтобы не раздувать историю найденным текстом.
 */
export function ToolResultPreview({ message }: { message: ChatMessage }) {
  const { t } = useI18n();
  const model = buildToolDisplayModel(message, t);
  const result = getToolResult(message);
  const preview = getToolPreview(message);
  const secondaryFiles = getSecondaryFiles(model.files, model.primaryFile);

  return (
    <div className="tool-result-preview">
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
    <details className="tool-details" open={!isLong}>
      <summary>
        <ChevronRight size={13} />
        {t('tool.preview.code')} {Boolean(result.truncated) || isLong ? `· ${t('tool.preview.truncated')}` : ''}
      </summary>
      <pre className="tool-code-preview">{preview || t('tool.preview.emptyFile')}</pre>
    </details>
  );
}

function EntriesList({ result }: { result: Record<string, unknown> }) {
  const { t } = useI18n();
  const entries = arrayValue(result.entries);
  const truncated = Boolean(result.truncated) || entries.length > LIST_PREVIEW_LIMIT;

  return (
    <ul className="tool-list-preview">
      {entries.slice(0, LIST_PREVIEW_LIMIT).map(renderEntryItem)}
      {truncated ? <li className="opacity-70">{t('tool.preview.moreItems')}</li> : null}
    </ul>
  );
}

function SearchFiles({ result }: { result: Record<string, unknown> }) {
  const { t } = useI18n();
  const files = getUniqueSearchFiles(result);
  const truncated = Boolean(result.truncated) || files.length > LIST_PREVIEW_LIMIT;

  return (
    <ul className="tool-list-preview tool-list-vertical">
      {files.slice(0, LIST_PREVIEW_LIMIT).map(renderSearchFile)}
      {truncated ? <li className="opacity-70">{t('tool.preview.moreFiles')}</li> : null}
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
    <div className="tool-bash-preview">
      <div className="tool-bash-command">
        <div className="tool-bash-command-label">
          <Terminal size={13} />
          <span>{t('common.command')}</span>
        </div>
        <pre>
          <code>{command}</code>
        </pre>
      </div>
      <dl className="tool-bash-facts">
        {facts.map((fact) => (
          <div key={fact.label} className={fact.tone ? `tool-bash-fact-${fact.tone}` : undefined}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      {error ? <ErrorText text={error} /> : null}
      {!result ? <p className="text-[var(--vscode-descriptionForeground)]">{t('tool.preview.waitingOutput')}</p> : null}
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
      {completedQuietly ? (
        <p className="text-[var(--vscode-descriptionForeground)]">{t('tool.preview.noOutput')}</p>
      ) : null}
    </div>
  );
}

function OutputBlock({ label, text, tone }: { label: string; text: string; tone: 'stdout' | 'stderr' }) {
  const { language, t } = useI18n();

  return (
    <details className={`tool-details tool-output-block tool-output-${tone}`} open>
      <summary>
        <ChevronRight size={13} />
        <span>{label}</span>
        <em>{getLineCountLabel(text, language, t)}</em>
      </summary>
      <pre className="tool-code-preview">{text}</pre>
    </details>
  );
}

function getBashFacts(
  message: ChatMessage,
  result: Record<string, unknown> | undefined,
  t: ReturnType<typeof useI18n>['t']
): BashFact[] {
  const cwd = asString(result?.cwd) || asString(message.args?.cwd) || '.';
  const facts: BashFact[] = [{ label: t('tool.fact.cwd'), value: cwd }];

  if (!result) {
    const timeoutMs = numberValue(message.args?.timeoutMs);
    facts.unshift({ label: t('tool.fact.status'), value: t('tool.status.running'), tone: 'running' });
    if (timeoutMs !== undefined) facts.push({ label: t('tool.fact.timeout'), value: formatDuration(timeoutMs) });
    return facts;
  }

  const exitCode = numberValue(result.exitCode);
  const timedOut = Boolean(result.timedOut);
  const ok = result.ok === true;
  const status = timedOut
    ? t('tool.result.timedOut')
    : exitCode === undefined
      ? t('tool.result.finished')
      : t('tool.result.exit', { code: exitCode });
  facts.unshift({ label: t('tool.fact.status'), value: status, tone: ok ? 'ok' : 'error' });

  const durationMs = numberValue(result.durationMs);
  if (durationMs !== undefined) facts.push({ label: t('tool.fact.duration'), value: formatDuration(durationMs) });

  const signal = asString(result.signal);
  if (signal) facts.push({ label: t('tool.fact.signal'), value: signal });

  return facts;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60_000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${Math.round(durationMs / 1000)}s`;
}

function getLineCountLabel(
  text: string,
  language: ReturnType<typeof useI18n>['language'],
  t: ReturnType<typeof useI18n>['t']
): string {
  const lines = text ? text.split(/\r?\n/).length : 0;
  return t(pluralKey(language, 'tool.result.lines', lines), { count: lines });
}

type BashFact = {
  label: string;
  value: string;
  tone?: 'ok' | 'error' | 'running';
};

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
    <li key={fileKey(file)}>
      <ListTree size={13} />
      <WorkspaceFileLink file={file} />
    </li>
  );
}

function FileLinks({ files }: { files: FileReference[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {files.map((file) => (
        <WorkspaceFileLink key={fileKey(file)} file={file} />
      ))}
    </div>
  );
}

function CompactFacts({ result }: { result: Record<string, unknown> }) {
  const facts = Object.entries(result)
    .filter(([, value]) => typeof value !== 'object')
    .map(([key, value]) => `${key}: ${String(value)}`);

  return <p className="text-[var(--vscode-descriptionForeground)]">{facts.join(' · ')}</p>;
}

function getUniqueSearchFiles(result: Record<string, unknown>): FileReference[] {
  const files = arrayValue(result.matches).map(fileFromSearchMatch).filter(Boolean) as FileReference[];

  return uniqueFiles(files);
}

function fileFromSearchMatch(match: unknown): FileReference | undefined {
  const item = asRecord(match);
  const path = asString(item?.path);
  return path ? { path } : undefined;
}

function getSecondaryFiles(files: FileReference[], primary?: FileReference): FileReference[] {
  if (!primary) return files;
  return files.filter((file) => fileKey(file) !== fileKey(primary));
}

function uniqueFiles(files: FileReference[]): FileReference[] {
  const seen = new Set<string>();
  return files.filter((file) => {
    const key = fileKey(file);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fileKey(file: FileReference): string {
  return `${file.path}:${file.line || 0}:${file.column || 0}`;
}

function Reason({ text }: { text: string }) {
  return <p className="leading-5 text-[var(--vscode-descriptionForeground)]">{text}</p>;
}

function ErrorText({ text }: { text: string }) {
  return <p className="text-[var(--vscode-errorForeground)]">{text}</p>;
}
