import { ChevronRight, Folder, ListTree } from 'lucide-react';
import type { ChatMessage } from '../../shared/types';
import { WorkspaceFileLink } from './WorkspaceFileLink';
import { buildToolDisplayModel, type FileReference } from './toolMessageModel';
import { arrayValue, asRecord, asString, getToolPreview, getToolResult } from './toolValue';

const CODE_PREVIEW_LIMIT = 1200;
const LIST_PREVIEW_LIMIT = 24;

/**
 * Что это: человекочитаемый preview результата tool-call.
 * Зачем нужно: история чата остаётся компактной, а детали раскрываются кликом по карточке.
 * Пример: grep_search показывает только список файлов, чтобы не раздувать историю найденным текстом.
 */
export function ToolResultPreview({ message }: { message: ChatMessage }) {
  const model = buildToolDisplayModel(message);
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

function renderPrimaryResult(message: ChatMessage, result?: Record<string, unknown>, preview?: Record<string, unknown>) {
  if (!result && preview) return <CompactFacts result={preview} />;
  if (!result) return null;
  if (asString(result.error)) return <ErrorText text={asString(result.error) || ''} />;

  if (message.name === 'read_file') return <CodePreview result={result} />;
  if (message.name === 'list_files') return <EntriesList result={result} />;
  if (message.name === 'grep_search') return <SearchFiles result={result} />;
  if (message.name === 'run_bash_script') return <BashScriptResult result={result} />;

  return <CompactFacts result={result} />;
}

function CodePreview({ result }: { result: Record<string, unknown> }) {
  const content = asString(result.content) || '';
  const isLong = content.length > CODE_PREVIEW_LIMIT;
  const preview = isLong ? `${content.slice(0, CODE_PREVIEW_LIMIT)}\n…` : content;

  return (
    <details className="tool-details" open={!isLong}>
      <summary>
        <ChevronRight size={13} />
        Code preview {Boolean(result.truncated) || isLong ? '· truncated' : ''}
      </summary>
      <pre className="tool-code-preview">{preview || 'Файл пустой.'}</pre>
    </details>
  );
}

function EntriesList({ result }: { result: Record<string, unknown> }) {
  const entries = arrayValue(result.entries);
  const truncated = Boolean(result.truncated) || entries.length > LIST_PREVIEW_LIMIT;

  return (
    <ul className="tool-list-preview">
      {entries.slice(0, LIST_PREVIEW_LIMIT).map(renderEntryItem)}
      {truncated ? <li className="opacity-70">…ещё элементы скрыты</li> : null}
    </ul>
  );
}

function SearchFiles({ result }: { result: Record<string, unknown> }) {
  const files = getUniqueSearchFiles(result);
  const truncated = Boolean(result.truncated) || files.length > LIST_PREVIEW_LIMIT;

  return (
    <ul className="tool-list-preview tool-list-vertical">
      {files.slice(0, LIST_PREVIEW_LIMIT).map(renderSearchFile)}
      {truncated ? <li className="opacity-70">…ещё файлы скрыты</li> : null}
    </ul>
  );
}

function BashScriptResult({ result }: { result: Record<string, unknown> }) {
  const stdout = asString(result.stdout) || '';
  const stderr = asString(result.stderr) || '';
  const facts = [
    `exit: ${String(result.exitCode ?? 'unknown')}`,
    `cwd: ${asString(result.cwd) || '.'}`,
    `duration: ${String(result.durationMs ?? 0)}ms`,
    Boolean(result.timedOut) ? 'timed out' : ''
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[var(--vscode-descriptionForeground)]">{facts.join(' · ')}</p>
      {stdout ? <OutputBlock label={`stdout${Boolean(result.stdoutTruncated) ? ' · truncated' : ''}`} text={stdout} /> : null}
      {stderr ? <OutputBlock label={`stderr${Boolean(result.stderrTruncated) ? ' · truncated' : ''}`} text={stderr} /> : null}
    </div>
  );
}

function OutputBlock({ label, text }: { label: string; text: string }) {
  return (
    <details className="tool-details" open>
      <summary>
        <ChevronRight size={13} />
        {label}
      </summary>
      <pre className="tool-code-preview">{text}</pre>
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
    <li key={fileKey(file)}>
      <ListTree size={13} />
      <WorkspaceFileLink file={file} />
    </li>
  );
}

function FileLinks({ files }: { files: FileReference[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {files.map((file) => <WorkspaceFileLink key={fileKey(file)} file={file} />)}
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
  const files = arrayValue(result.matches)
    .map(fileFromSearchMatch)
    .filter(Boolean) as FileReference[];

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
