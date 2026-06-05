import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useI18n } from '../../i18n';
import { Button, ModalBackdrop, ModalHeader, ModalSurface, TextField } from '../../ui';
import styles from './PromptHistoryModal.module.scss';
import type { PromptHistoryItem } from './promptHistory';

export type PromptHistoryModalProps = {
  history: PromptHistoryItem[];
  onSelect(prompt: string): void;
  onClose(): void;
};

/**
 * Что это: модалка поиска по истории отправленных prompt-ов.
 * Зачем нужно: позволяет быстро найти и повторно подставить конкретный prompt из истории текущего и глобального чатов.
 */
export function PromptHistoryModal({ history, onSelect, onClose }: PromptHistoryModalProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const filteredHistory = useMemo(() => filterHistory(history, query), [history, query]);

  return (
    <ModalBackdrop onMouseDown={onClose}>
      <ModalSurface className={styles.modal} onMouseDown={(event) => event.stopPropagation()}>
        <ModalHeader>
          <div>
            <h2>{t('composer.history.title')}</h2>
            <p>{t('composer.history.description')}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            shape="round"
            iconOnly
            leadingIcon={<X size={14} />}
            title={t('common.close')}
            aria-label={t('common.close')}
            onClick={onClose}
          />
        </ModalHeader>
        <div className={styles.content}>
          <TextField
            autoFocus
            value={query}
            leadingIcon={<Search size={14} />}
            placeholder={t('composer.history.search')}
            onChange={(event) => setQuery(event.target.value)}
          />
          {filteredHistory.length > 0 ? (
            <div className={styles.list} role="listbox" aria-label={t('composer.history.title')}>
              {filteredHistory.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.item}
                  title={item.prompt}
                  onClick={() => onSelect(item.prompt)}
                >
                  <span className={styles.prompt}>{item.prompt}</span>
                  <span className={styles.meta}>{formatDateTime(item.createdAt)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>{t('composer.history.empty')}</div>
          )}
        </div>
      </ModalSurface>
    </ModalBackdrop>
  );
}

function filterHistory(history: PromptHistoryItem[], query: string): PromptHistoryItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return history;
  }

  return history.filter((item) => item.prompt.toLowerCase().includes(normalizedQuery));
}

function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp);
}
