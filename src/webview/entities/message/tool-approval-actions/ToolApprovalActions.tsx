import { Check, Database, MessageSquareText, Play, Square } from 'lucide-react';
import { useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { agentActions } from '../../../shared/lib/agentActions';
import { Button } from '../../../shared/ui';
import styles from './ToolApprovalActions.module.scss';
import type { ToolApprovalActionsProps } from './types';

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
  const cleanComment = comment.trim();
  const cleanRememberGlobal = rememberGlobal.trim();
  const cleanRememberProject = rememberProject.trim();

  function resolve(decision: 'approve' | 'deny-stop' | 'deny-continue') {
    agentActions.resolveToolCall(messageId, decision, {
      comment: cleanComment || undefined,
      rememberGlobal: cleanRememberGlobal || undefined,
      rememberProject: cleanRememberProject || undefined
    });
    onResolved?.();
  }

  return (
    <div className={`${styles.root} ${compact ? styles.compact : ''}`}>
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
            onChange={(event) => setRememberProject(event.target.value)}
          />
        </label>
      </div>
      <div className={styles.buttonRow}>
        <Button
          className={styles.approveButton}
          variant="primary"
          autoFocus={autoFocusApprove}
          leadingIcon={<Check size={14} />}
          onClick={() => resolve('approve')}
        >
          {t('tool.approve')}
        </Button>
        <Button variant="danger" leadingIcon={<Square size={13} />} onClick={() => resolve('deny-stop')}>
          {t('tool.denyStop')}
        </Button>
        <Button variant="secondary" leadingIcon={<Play size={13} />} onClick={() => resolve('deny-continue')}>
          {t('tool.denyContinue')}
        </Button>
      </div>
    </div>
  );
}
