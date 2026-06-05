import { BrainCircuit } from 'lucide-react';
import { useState } from 'react';

import { agentActions } from '../../lib/agentActions';
import { Button, ModalBackdrop, ModalHeader, ModalSurface } from '../../ui';
import { IconButton } from '../../ui/IconButton';
import styles from './AnalyzeMemoryButton.module.scss';
import type { AnalyzeMemoryButtonProps } from './types';

/**
 * Что это: компактная кнопка запуска субагента памяти для текущего чата.
 * Зачем нужно: пользователь сам решает, когда после ответа агента искать новые заметки для долговременной памяти.
 */
export function AnalyzeMemoryButton({ chatId, disabled }: AnalyzeMemoryButtonProps) {
  const [approvalOpen, setApprovalOpen] = useState(false);

  function runAnalysis() {
    setApprovalOpen(false);
    agentActions.runMemoryAnalysis(chatId);
  }

  return (
    <>
      <IconButton
        title="Проанализировать чат для новых заметок памяти"
        disabled={disabled}
        onClick={() => setApprovalOpen(true)}
      >
        <BrainCircuit size={15} />
      </IconButton>
      {approvalOpen ? (
        <ModalBackdrop tone="approval" role="presentation">
          <ModalSurface tone="approval" role="dialog" aria-modal="true" aria-label="Запуск субагента памяти">
            <ModalHeader tone="approval">
              <div>
                <h2>Запустить субагента памяти?</h2>
                <p>Он проанализирует текущий чат и предложит новые заметки для памяти.</p>
              </div>
            </ModalHeader>
            <div className={styles.body}>
              <p className={styles.description}>
                Анализ использует модель из настроек memory-субагента или модель текущего чата, если отдельная модель не
                выбрана. Найденные заметки появятся в настройках памяти как предложения, которые можно сохранить или
                отклонить.
              </p>
            </div>
            <div className={styles.actions}>
              <Button size="sm" variant="secondary" onClick={() => setApprovalOpen(false)}>
                Отмена
              </Button>
              <Button size="sm" variant="primary" leadingIcon={<BrainCircuit size={13} />} onClick={runAnalysis}>
                Запустить анализ
              </Button>
            </div>
          </ModalSurface>
        </ModalBackdrop>
      ) : null}
    </>
  );
}
