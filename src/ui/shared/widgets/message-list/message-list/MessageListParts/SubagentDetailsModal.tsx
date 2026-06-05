import { MessageCard } from '../../../../entities/message';
import { type SubagentRun } from '../../../../types';
import styles from '../MessageList.module.scss';

export function SubagentDetailsModal({ run, onClose }: { run?: SubagentRun; onClose(): void }) {
  if (!run) {
    return null;
  }

  return (
    <div className={styles.subagentModalBackdrop} role="presentation" onClick={onClose}>
      <section
        className={styles.subagentModal}
        role="dialog"
        aria-modal="true"
        aria-label="Детали субагента"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.subagentModalHeader}>
          <div>
            <strong>{run.title}</strong>
            <span>
              {run.kind} · {run.mode} · {run.model}
            </span>
          </div>
          <button
            type="button"
            className={styles.subagentModalClose}
            onClick={onClose}
            aria-label="Закрыть детали субагента"
          >
            ×
          </button>
        </div>
        <div className={styles.subagentModalMeta}>
          <span>Статус: {run.status}</span>
          <span>Parent chat: {run.parentChatId}</span>
          <span>Старт: {new Date(run.startedAt).toLocaleString()}</span>
          {run.finishedAt ? <span>Финиш: {new Date(run.finishedAt).toLocaleString()}</span> : null}
          {run.error ? <span className={styles.subagentModalError}>Ошибка: {run.error}</span> : null}
        </div>
        <div className={styles.subagentModalMessages}>
          {run.messages.map((message) => (
            <MessageCard key={message.id} message={message} defaultExpanded />
          ))}
        </div>
      </section>
    </div>
  );
}
