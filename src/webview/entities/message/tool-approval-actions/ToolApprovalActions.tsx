import { Check, MessageSquareText, Play, Square } from 'lucide-react';
import { useState } from 'react';

import { useI18n } from '../../../shared/i18n';
import { vscode } from '../../../shared/lib/vscode';
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
  const cleanComment = comment.trim();

  function resolve(decision: 'approve' | 'deny-stop' | 'deny-continue') {
    vscode.postMessage({ type: 'resolveToolCall', messageId, decision, comment: cleanComment || undefined });
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
