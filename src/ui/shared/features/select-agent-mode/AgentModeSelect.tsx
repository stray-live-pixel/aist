import { Check, ChevronDown, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useI18n } from '../../shared/i18n';
import { agentActions } from '../../shared/lib/agentActions';
import type { AgentModeId } from '../../shared/types';
import styles from './AgentModeSelect.module.scss';
import type { AgentModeSelectProps } from './types';
import { canDeleteAgentMode } from './utils';

/**
 * Что это: компактный dropdown выбора режима агента с подтверждением удаления пользовательских режимов.
 * Зачем нужно: режимы влияют на системный prompt, поэтому компонент сразу отправляет IPC-события и держит локально только состояние раскрытия/подтверждения.
 */
export function AgentModeSelect({ modes, activeId, className }: AgentModeSelectProps) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<AgentModeId | undefined>();

  const activeMode = modes.find((mode) => mode.id === activeId) || modes[0];

  useEffect(() => {
    if (!open) {
      setDeleteTargetId(undefined);
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (deleteTargetId && !modes.some((mode) => mode.id === deleteTargetId)) {
      setDeleteTargetId(undefined);
    }
  }, [modes, deleteTargetId]);

  function selectMode(modeId: AgentModeId) {
    agentActions.setAgentMode(modeId);
    setOpen(false);
    setDeleteTargetId(undefined);
  }

  function deleteMode(modeId: AgentModeId) {
    agentActions.deleteAgentMode(modeId);
    setDeleteTargetId(undefined);
  }

  return (
    <div ref={rootRef} className={className ? `${styles.root} ${className}` : styles.root}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.triggerLabel}>{activeMode?.label ?? activeId}</span>
        <ChevronDown size={14} className={open ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron} />
      </button>

      {open ? (
        <div className={styles.menu} role="listbox" aria-label={t('summary.agentMode')}>
          {modes.map((mode) => {
            const active = mode.id === activeId;
            const deletable = canDeleteAgentMode(mode.id);
            const confirmingDelete = deleteTargetId === mode.id;

            return (
              <div key={mode.id} className={active ? `${styles.item} ${styles.itemActive}` : styles.item}>
                <button
                  type="button"
                  className={styles.optionButton}
                  role="option"
                  aria-selected={active}
                  onClick={() => selectMode(mode.id)}
                >
                  <Check
                    size={14}
                    className={active ? styles.checkIcon : `${styles.checkIcon} ${styles.checkHidden}`}
                  />
                  <span className={styles.optionLabel}>{mode.label}</span>
                </button>

                {deletable ? (
                  confirmingDelete ? (
                    <>
                      <button
                        type="button"
                        className={styles.itemActionDanger}
                        title={t('common.confirmDelete')}
                        aria-label={t('common.confirmDelete')}
                        onClick={() => deleteMode(mode.id)}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className={styles.itemAction}
                        title={t('common.cancelDelete')}
                        aria-label={t('common.cancelDelete')}
                        onClick={() => setDeleteTargetId(undefined)}
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.itemActionDanger}
                      title={t('common.delete')}
                      aria-label={t('common.delete')}
                      onClick={() => setDeleteTargetId(mode.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
