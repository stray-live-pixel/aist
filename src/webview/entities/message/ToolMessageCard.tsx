import { Check, ChevronRight, Code2, X } from 'lucide-react';
import { type MouseEvent, useEffect, useState } from 'react';

import { vscode } from '../../shared/lib/vscode';
import type { ChatMessage } from '../../shared/types';
import { ToolIcon } from '../../shared/ui/ToolIcon';
import { ToolRawJsonModal } from './ToolRawJsonModal';
import { ToolResultPreview } from './ToolResultPreview';
import { WorkspaceFileLink } from './WorkspaceFileLink';
import { formatMessageDate, formatMessageUsagePill, formatToolStatus, getToolStatusClass } from './messageFormatting';
import { type ToolDisplayModel, buildToolDisplayModel } from './toolMessageModel';

/**
 * Что это: компактная карточка tool-call.
 * Зачем нужно: первая строка остаётся компактной, а тяжёлые детали рендерятся только после раскрытия.
 * Пример: шеврон раскрывает preview результата, READ FILE открывает файл, а </> показывает сырой JSON.
 */
export function ToolMessageCard({ message }: { message: ChatMessage }) {
  const [expanded, setExpanded] = useState(message.approval === 'pending');
  const [rawOpen, setRawOpen] = useState(false);
  const model = buildToolDisplayModel(message);
  const isRunning = message.status === 'running' || message.status === 'waiting';
  const needsApproval = message.approval === 'pending';

  useEffect(() => {
    if (needsApproval) {
      setExpanded(true);
    }
  }, [needsApproval]);

  return (
    <article className={getCardClassName(message, model)}>
      <div className="tool-card-body">
        <ToolHeaderContent
          message={message}
          model={model}
          expanded={expanded}
          isRunning={isRunning}
          onToggle={() => setExpanded((value) => !value)}
        />
        {expanded ? (
          <>
            <ToolDetailsHeader message={message} model={model} onRawClick={() => setRawOpen(true)} />
            <ToolResultPreview message={message} />
            {needsApproval ? <ApprovalActions messageId={message.id} /> : null}
          </>
        ) : null}
      </div>
      {formatMessageUsagePill(message.usage)}
      {rawOpen ? <ToolRawJsonModal message={message} onClose={closeRawModal(setRawOpen)} /> : null}
    </article>
  );
}

function ToolHeaderContent({ message, model, expanded, isRunning, onToggle }: ToolHeaderContentProps) {
  return (
    <div className="tool-header-row">
      <button
        className="tool-chevron-button"
        title={expanded ? 'Скрыть детали инструмента' : 'Показать детали инструмента'}
        aria-expanded={expanded}
        onClick={stopAndRun(onToggle)}
      >
        <ChevronRight size={14} />
      </button>
      <div className="tool-header-main">
        <span className="tool-icon-pill">
          <ToolIcon name={message.name} size={14} className={isRunning ? 'animate-pulse' : ''} />
        </span>
        {formatMessageDate(message.createdAt)}
        <ToolTitle model={model} />
      </div>
    </div>
  );
}

function ToolDetailsHeader({ message, model, onRawClick }: ToolDetailsHeaderProps) {
  return (
    <div className="tool-details-header">
      <span className="tool-summary">{model.summary}</span>
      <ToolStatusBadge message={message} />
      <button className="tool-icon-button" title="Показать JSON" onClick={stopAndRun(onRawClick)}>
        <Code2 size={14} />
      </button>
    </div>
  );
}

function ToolTitle({ model }: { model: ToolDisplayModel }) {
  return (
    <div className="tool-title">
      {model.primaryFile ? (
        <WorkspaceFileLink file={{ ...model.primaryFile, label: model.action }} />
      ) : (
        <span className="tool-title-text">{model.title}</span>
      )}
    </div>
  );
}

function ToolStatusBadge({ message }: { message: ChatMessage }) {
  return <span className={`tool-status-badge ${getToolStatusClass(message.status)}`}>{formatToolStatus(message)}</span>;
}

function ApprovalActions({ messageId }: { messageId: string }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" onClick={stopPropagation}>
      <button
        className="primary-button h-8 min-w-0"
        onClick={() => vscode.postMessage({ type: 'resolveToolCall', messageId, approved: true })}
      >
        <Check size={14} />
        <span>Allow</span>
      </button>
      <button
        className="secondary-button"
        onClick={() => vscode.postMessage({ type: 'resolveToolCall', messageId, approved: false })}
      >
        <X size={14} />
        <span>Deny</span>
      </button>
    </div>
  );
}

function getCardClassName(message: ChatMessage, model: ToolDisplayModel): string {
  const errorClass = message.status === 'error' ? 'border-[var(--vscode-errorForeground)]' : '';
  return `message-card tool-card tool-tone-${model.tone} ${errorClass}`;
}

function stopPropagation(event: MouseEvent) {
  event.stopPropagation();
}

function stopAndRun(action: () => void) {
  return (event: MouseEvent) => {
    event.stopPropagation();
    action();
  };
}

function closeRawModal(setRawOpen: (value: boolean) => void) {
  return (event?: MouseEvent) => {
    event?.stopPropagation();
    setRawOpen(false);
  };
}

type ToolHeaderContentProps = {
  message: ChatMessage;
  model: ToolDisplayModel;
  expanded: boolean;
  isRunning: boolean;
  onToggle(): void;
};

type ToolDetailsHeaderProps = {
  message: ChatMessage;
  model: ToolDisplayModel;
  onRawClick(): void;
};
