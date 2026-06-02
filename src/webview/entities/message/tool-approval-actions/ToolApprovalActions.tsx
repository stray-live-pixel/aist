import { Check, Database, LoaderCircle, MessageSquareText, Play, Square } from 'lucide-react';
import { useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { agentActions } from '../../../shared/lib/agentActions';
import { Button } from '../../../shared/ui';
import styles from './ToolApprovalActions.module.scss';
import type { ToolApprovalActionsProps } from './types';

type ApprovalDecision = 'approve' | 'deny-stop' | 'deny-continue';

/**
 * Единый UI принятия решения по tool-call.
 * Используется и в модалке, и внутри карточки инструмента, чтобы пользователь мог решить
 * из любого контекста: главный сценарий — модалка, запасной — история чата рядом с вызовом.
 */
export function ToolApprovalActions({
  messageId,
  compact = false,
  autoFocusApprove = false,
  onResolved
}: ToolApprovalActionsProps) {
  const { t } = useI18n();
  const [comment, setComment] = useState('');
  const [rememberGlobal, setRememberGlobal] = useState('');
  const [rememberProject, setRememberProject] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState<ApprovalDecision | undefined>();
  const cleanComment = comment.trim();
  const cleanRememberGlobal = rememberGlobal.trim();
  const cleanRememberProject = rememberProject.trim();
  const submitting = submittingDecision !== undefined;

  function resolve(decision: ApprovalDecision) {
    if (submitting) {
      return;
    }

    setSubmittingDecision(decision);
    agentActions.resolveToolCall(messageId, decision, {
      comment: cleanComment || undefined,
      rememberGlobal: cleanRememberGlobal || undefined,
      rememberProject: cleanRememberProject || undefined
    });
    onResolved?.();
  }

  return (
    <div className={`${styles.root} ${compact ? styles.compact : ''}`} aria-busy={submitting}>
      <label className={styles.comment}>
        <span className={styles.commentLabel}>
          <MessageSquareText size={13} />
          {t('tool.commentLabel')}
        </span>
        <textarea
          className={styles.textarea}
          value={comment}
          rows={compact ? 2 : 3}
          placeholder={t('tool.commentPlaceholder')}
          disabled={submitting}
          onChange={(event) => setComment(event.target.value)}
        />
      </label>
      <div className={styles.memoryGrid}>
        <label className={styles.comment}>
          <span className={styles.commentLabel}>
            <Database size={13} />
            {t('tool.rememberGlobalLabel')}
          </span>
          <textarea
            className={styles.textarea}
            value={rememberGlobal}
            rows={compact ? 2 : 3}
            placeholder={t('tool.rememberGlobalPlaceholder')}
            disabled={submitting}
            onChange={(event) => setRememberGlobal(event.target.value)}
          />
        </label>
        <label className={styles.comment}>
          <span className={styles.commentLabel}>
            <Database size={13} />
            {t('tool.rememberProjectLabel')}
          </span>
          <textarea
            className={styles.textarea}
            value={rememberProject}
            rows={compact ? 2 : 3}
            placeholder={t('tool.rememberProjectPlaceholder')}
            disabled={submitting}
            onChange={(event) => setRememberProject(event.target.value)}
          />
        </label>
      </div>
      <div className={styles.buttonRow}>
        <Button
          className={styles.approveButton}
          variant="primary"
          autoFocus={autoFocusApprove}
          leadingIcon={submittingDecision === 'approve' ? <LoadingIcon /> : <Check size={14} />}
          disabled={submitting}
          title={submittingDecision === 'approve' ? t('activity.waitingForApproval') : undefined}
          onClick={() => resolve('approve')}
        >
          {submittingDecision === 'approve' ? t('activity.runningTool') : t('tool.approve')}
        </Button>
        <Button
          variant="danger"
          leadingIcon={submittingDecision === 'deny-stop' ? <LoadingIcon /> : <Square size={13} />}
          disabled={submitting}
          title={submittingDecision === 'deny-stop' ? t('activity.waitingForApproval') : undefined}
          onClick={() => resolve('deny-stop')}
        >
          {submittingDecision === 'deny-stop' ? t('activity.stopping') : t('tool.denyStop')}
        </Button>
        <Button
          variant="secondary"
          leadingIcon={submittingDecision === 'deny-continue' ? <LoadingIcon /> : <Play size={13} />}
          disabled={submitting}
          title={submittingDecision === 'deny-continue' ? t('activity.waitingForApproval') : undefined}
          onClick={() => resolve('deny-continue')}
        >
          {submittingDecision === 'deny-continue' ? t('activity.runningTool') : t('tool.denyContinue')}
        </Button>
      </div>
    </div>
  );
}

function LoadingIcon() {
  return <LoaderCircle className={styles.spinner} size={14} aria-hidden="true" />;
}
