import { Check, ChevronDown, Cpu, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '../../i18n';
import { agentActions } from '../../lib/agentActions';
import styles from './ModelSelect.module.scss';
import type { ModelSelectProps } from './types';
import { filterModels, getSelectedModel, groupModelsByProvider } from './utils';

/**
 * Что это: searchable dropdown выбора модели между OpenRouter и ChatGPT Codex.
 * Зачем нужно: список моделей может быть длинным, поэтому компонент строит display model с поиском и группами, но наружу отправляет только выбранный id.
 */
export function ModelSelect({ model, models, disabled }: ModelSelectProps) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = useMemo(() => getSelectedModel(model, models), [model, models]);
  const options = useMemo(() => filterModels(models, query), [models, query]);
  const groups = useMemo(() => groupModelsByProvider(options), [options]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setQuery('');
    }
  }, [disabled]);

  useEffect(() => {
    if (!open) {
      return;
    }

    searchRef.current?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function selectModel(nextModel: string) {
    agentActions.setModel(nextModel);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <span className={styles.label}>
        <Cpu size={14} className={styles.labelIcon} />
        <span>{t('summary.model')}</span>
      </span>
      <button
        type="button"
        className={styles.trigger}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.triggerText}>
          {selected.name} ({selected.id})
        </span>
        <ChevronDown size={14} className={open ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron} />
      </button>

      {open ? (
        <div className={styles.menu}>
          <div className={styles.searchBox}>
            <Search size={14} className={styles.searchIcon} />
            <input
              ref={searchRef}
              className={styles.searchInput}
              placeholder={t('modelSelect.search')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className={styles.list} role="listbox" aria-label={t('modelSelect.models')}>
            {groups.length ? (
              groups.map((group) => (
                <div key={group.provider} className={styles.group}>
                  <div className={styles.groupTitle}>{group.label}</div>
                  {group.options.map((item) => {
                    const active = item.id === model;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={active ? `${styles.optionButton} ${styles.optionActive}` : styles.optionButton}
                        role="option"
                        aria-selected={active}
                        onClick={() => selectModel(item.id)}
                      >
                        <Check
                          size={14}
                          className={active ? styles.optionCheck : `${styles.optionCheck} ${styles.optionCheckHidden}`}
                        />
                        <span className={styles.optionText}>
                          <span className={styles.optionName}>{item.name}</span>
                          <span className={active ? styles.optionId : `${styles.optionId} ${styles.optionIdMuted}`}>
                            {item.id}
                            {item.supportsTools ? '' : ` - ${t('tool.preview.noTools')}`}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className={styles.empty}>{t('tool.preview.noModels')}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
