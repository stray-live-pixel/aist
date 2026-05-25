import { Check, MessageSquareText, Play, Square } from 'lucide-react';
import { useState } from 'react';

import { useI18n } from '../../shared/i18n';
import { vscode } from '../../shared/lib/vscode';

export type ToolApprovalActionsProps = {
  messageId: string;
  compact?: boolean;
  autoFocusApprove?: boolean;
  onResolved?(): void;
};

/**
 * Единый UI принятия решения по tool-call.
 * Он используется и в модалке, и внутри карточки инструмента, чтобы пользователь мог решить задачу
 * из любого контекста: главный сценарий — модалка, запасной — история чата рядом с самим вызовом.
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
    <div className={`tool-approval-actions ${compact ? 'tool-approval-actions-compact' : ''}`}>
      <label className="tool-approval-comment">
        <span>
          <MessageSquareText size={13} />
          {t('tool.commentLabel')}
        </span>
        <textarea
          value={comment}
          rows={compact ? 2 : 3}
          placeholder={t('tool.commentPlaceholder')}
          onChange={(event) => setComment(event.target.value)}
        />
      </label>
      <div className="tool-approval-button-row">
        <button className="primary-button h-8 min-w-0" autoFocus={autoFocusApprove} onClick={() => resolve('approve')}>
          <Check size={14} />
          <span>{t('tool.approve')}</span>
        </button>
        <button className="danger-button" onClick={() => resolve('deny-stop')}>
          <Square size={13} />
          <span>{t('tool.denyStop')}</span>
        </button>
        <button className="secondary-button" onClick={() => resolve('deny-continue')}>
          <Play size={13} />
          <span>{t('tool.denyContinue')}</span>
        </button>
      </div>
    </div>
  );
}
