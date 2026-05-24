import { Check } from 'lucide-react';
import { type InputHTMLAttributes, forwardRef, useId } from 'react';

import { classNames } from '../lib/classNames';
import styles from './Checkbox.module.scss';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  description?: string;
};

/**
 * Что это: checkbox для булевых настроек.
 * Зачем нужно: единый доступный контрол с описанием и macOS-like отметкой.
 * Пример: <Checkbox label="Auto approve read tools" />.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <label className={classNames(styles.checkbox, className)} htmlFor={inputId}>
        <span className={styles.boxWrap}>
          <input ref={ref} id={inputId} className={styles.input} type="checkbox" {...props} />
          <span className={styles.box} aria-hidden="true">
            <Check size={13} />
          </span>
        </span>
        <span className={styles.text}>
          <span className={styles.label}>{label}</span>
          {description ? <span className={styles.description}>{description}</span> : null}
        </span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
