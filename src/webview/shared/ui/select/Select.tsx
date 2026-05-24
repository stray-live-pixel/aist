import { ChevronDown } from 'lucide-react';
import { type SelectHTMLAttributes, forwardRef, useId } from 'react';

import { classNames } from '../lib/classNames';
import styles from './Select.module.scss';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
};

/**
 * Что это: универсальный select для выбора значения из списка.
 * Зачем нужно: нативная доступность select плюс единый macOS-like внешний вид.
 * Пример: <Select label="Model" options={models} />.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, options, placeholder, className, id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    return (
      <label className={classNames(styles.field, className)} htmlFor={selectId}>
        {label ? <span className={styles.label}>{label}</span> : null}
        <span className={classNames(styles.control, error && styles.invalid)}>
          <select ref={ref} id={selectId} className={styles.select} aria-invalid={Boolean(error)} {...props}>
            {placeholder ? <option value="">{placeholder}</option> : null}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className={styles.chevron} size={16} />
        </span>
        {error ? (
          <span className={styles.error}>{error}</span>
        ) : hint ? (
          <span className={styles.hint}>{hint}</span>
        ) : null}
      </label>
    );
  }
);

Select.displayName = 'Select';
