import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import { classNames } from '../lib/classNames';
import styles from './Select.module.scss';
import type { SelectOption, SelectSize } from './types';

/**
 * Что это: видимая кнопка-trigger custom Select.
 * Зачем нужно: trigger отвечает только за value label, icon, chevron и accessibility атрибуты.
 * Какую продуктовую проблему решает: Select остаётся keyboard/focus friendly и не ломает компактные controls.
 */
export function SelectTrigger({
  disabled,
  displayLabel,
  leadingIcon,
  open,
  placeholder,
  selectFallback,
  selected,
  size,
  title,
  ariaLabel,
  onToggle
}: {
  disabled?: boolean;
  displayLabel: string;
  leadingIcon?: ReactNode;
  open: boolean;
  placeholder?: string;
  selectFallback: string;
  selected?: SelectOption;
  size: SelectSize;
  title?: string;
  ariaLabel?: string;
  onToggle(): void;
}) {
  return (
    <span className={classNames(styles.control, open && styles.open)}>
      <button
        type="button"
        className={classNames(styles.trigger, leadingIcon ? styles.withIcon : undefined)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel || placeholder || selectFallback}
        title={title || selected?.label || placeholder}
        onClick={onToggle}
      >
        {leadingIcon ? <span className={styles.icon}>{leadingIcon}</span> : null}
        <span className={classNames(styles.value, !selected && styles.placeholder)}>{displayLabel}</span>
        <ChevronDown className={styles.chevron} size={size === 'sm' ? 14 : 16} />
      </button>
    </span>
  );
}
