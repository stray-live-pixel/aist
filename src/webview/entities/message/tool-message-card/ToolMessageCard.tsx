import { ChevronRight, Code2 } from 'lucide-react';
import { type MouseEvent, useEffect, useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import type { ChatMessage } from '../../../shared/types';
import { ToolIcon } from '../../../shared/ui/ToolIcon';
import {
  formatMessageDate,
  formatMessageUsagePill,
  formatToolStatusLocalized,
  getToolStatusClass
} from '../message-formatting';
import { ToolApprovalActions } from '../tool-approval-actions';
import { type ToolDisplayModel, buildToolDisplayModel } from '../tool-message-model';
import { ToolRawJsonModal } from '../tool-raw-json-modal';
import { ToolResultPreview } from '../tool-result-preview';
import { WorkspaceFileLink } from '../workspace-file-link';
import styles from './ToolMessageCard.module.scss';
import type { ToolMessageCardProps } from './types';
import { TONE_CLASS_MAP } from './utils';

/**
 * Что это: компактная карточка tool-call.
 * Зачем нужно: первая строка остаётся компактной, а тяжёлые детали рендерятся только после раскрытия.
 * Пример: шеврон раскрывает preview результата, READ FILE открывает файл, а </> показывает сырой JSON.
 */
export function ToolMessageCard({ message, collapseToolId }: ToolMessageCardProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(message.approval === 'pending');
  const [rawOpen, setRawOpen] = useState(false);
  const model = buildToolDisplayModel(message, t);
  const isRunning = message.status === 'running' || message.status === 'waiting';
  const needsApproval = message.approval === 'pending';

  useEffect(() => {
    if (needsApproval) {
      setExpanded(true);
    }
  }, [needsApproval]);

  useEffect(() => {
    if (collapseToolId === message.id && !needsApproval) {
      setExpanded(false);
    }
  }, [collapseToolId, message.id, needsApproval]);

  const toneClass = styles[TONE_CLASS_MAP[model.tone]] || '';
  const errorClass = message.status === 'error' ? styles.errorBorder : '';

  return (
    <article className={`${styles.root} ${toneClass} ${errorClass}`}>
      <div className={styles.body}>
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
            {needsApproval ? (
              <div onClick={stopPropagation}>
                <ToolApprovalActions messageId={message.id} compact onResolved={() => setExpanded(false)} />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      {formatMessageUsagePill(message.usage)}
      {rawOpen ? <ToolRawJsonModal message={message} onClose={closeRawModal(setRawOpen)} /> : null}
    </article>
  );
}

function ToolHeaderContent({ message, model, expanded, isRunning, onToggle }: ToolHeaderContentProps) {
  const { t } = useI18n();

  return (
    <div className={styles.headerRow}>
      <button
        className={styles.chevronButton}
        title={expanded ? t('tool.hideDetails') : t('tool.showDetails')}
        aria-expanded={expanded}
        onClick={stopAndRun(onToggle)}
      >
        <ChevronRight size={14} />
      </button>
      <div className={styles.headerMain}>
        <span className={styles.iconPill}>
          <ToolIcon name={message.name} size={14} className={isRunning ? 'animate-pulse' : ''} />
          <span className={styles.iconPillLabel}>{model.action}</span>
        </span>
        {formatMessageDate(message.createdAt)}
        <ToolTitle model={model} />
      </div>
      {!expanded && message.reason ? <div className={styles.reasonRow}>{message.reason}</div> : null}
    </div>
  );
}

function ToolDetailsHeader({ message, model, onRawClick }: ToolDetailsHeaderProps) {
  const { t } = useI18n();
  const statusClassName = getToolStatusClass(message.status);

  return (
    <div className={styles.detailsHeader}>
      <span className={styles.summary}>{model.summary}</span>
      <span
        className={`${styles.statusBadge} ${styles[statusClassName === 'error' ? 'statusError' : 'statusNeutral']}`}
      >
        {formatToolStatusLocalized(message, t)}
      </span>
      <button className={styles.iconButton} title={t('tool.showJson')} onClick={stopAndRun(onRawClick)}>
        <Code2 size={14} />
      </button>
    </div>
  );
}

function ToolTitle({ model }: { model: ToolDisplayModel }) {
  return (
    <div className={styles.title}>
      {model.primaryFile ? (
        <WorkspaceFileLink file={model.primaryFile} />
      ) : (
        <span className={styles.titleText}>{model.title}</span>
      )}
    </div>
  );
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
