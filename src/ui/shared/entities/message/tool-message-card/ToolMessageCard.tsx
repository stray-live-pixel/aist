import { ChevronRight, Code2 } from 'lucide-react';
import { type MouseEvent, memo, useEffect, useMemo, useState } from 'react';

import { useI18n } from '../../../i18n';
import type { ChatMessage } from '../../../types';
import { ToolIcon } from '../../../ui/ToolIcon';
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
import { asString, getToolResult } from '../tool-value';
import { WorkspaceFileLink } from '../workspace-file-link';
import styles from './ToolMessageCard.module.scss';
import { areToolMessageCardPropsEqual } from './areToolMessageCardPropsEqual';
import type { ToolMessageCardProps } from './types';
import { TONE_CLASS_MAP } from './utils';

/**
 * Что это: компактная карточка tool-call.
 * Зачем нужно: первая строка остаётся компактной, а тяжёлые детали рендерятся только после раскрытия.
 * Пример: шеврон раскрывает preview результата, READ FILE открывает файл, а </> показывает сырой JSON.
 */
export const ToolMessageCard = memo(ToolMessageCardView, areToolMessageCardPropsEqual);

function ToolMessageCardView({ message, collapseToolId }: ToolMessageCardProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(message.approval === 'pending');
  const [rawOpen, setRawOpen] = useState(false);
  const model = useMemo(() => buildToolDisplayModel(message, t), [message, t]);
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
            <ApprovalFeedback message={message} />
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
      {!expanded ? <ToolIntentSummary message={message} /> : null}
    </div>
  );
}

function ToolIntentSummary({ message }: { message: ChatMessage }) {
  const { t } = useI18n();
  if (!message.reason && !message.nextStep) {
    return null;
  }

  return (
    <div className={styles.intentSummary}>
      {message.reason ? (
        <div className={styles.intentRow}>
          <span className={styles.intentLabel}>{t('tool.reasonLabel')}</span>
          <span className={styles.intentText}>{message.reason}</span>
        </div>
      ) : null}
      {message.nextStep ? (
        <div className={styles.intentRow}>
          <span className={styles.intentLabel}>{t('tool.nextStepLabel')}</span>
          <span className={styles.intentText}>{message.nextStep}</span>
        </div>
      ) : null}
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

function ApprovalFeedback({ message }: { message: ChatMessage }) {
  const { t } = useI18n();
  const comment = getApprovalComment(message);
  if (!message.approval || message.approval === 'pending') {
    return null;
  }

  const decisionLabel =
    message.approval === 'approved' ? t('tool.approvalDecision.approved') : t('tool.approvalDecision.denied');

  return (
    <div className={`${styles.approvalFeedback} ${message.approval === 'denied' ? styles.approvalDenied : ''}`}>
      <span className={styles.approvalDecision}>{decisionLabel}</span>
      {comment ? (
        <span className={styles.approvalComment}>
          <strong>{t('tool.approvalComment')}</strong>
          {comment}
        </span>
      ) : null}
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

function getApprovalComment(message: ChatMessage): string | undefined {
  const result = getToolResult(message);
  return (
    asString(message.userApprovalComment) ||
    asString(message.userComment) ||
    asString(result?.userApprovalComment) ||
    asString(result?.comment) ||
    asString(result?.userComment)
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
