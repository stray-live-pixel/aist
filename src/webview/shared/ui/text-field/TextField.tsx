import { type InputHTMLAttributes, type ReactNode, forwardRef, useId } from 'react';

import { classNames } from '../lib/classNames';
import styles from './TextField.module.scss';

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailingSlot?: ReactNode;
};

/**
 * Что это: универсальное однострочное поле ввода.
 * Зачем нужно: одинаковые label/hint/error, focus-ring и macOS-like поверхность во всех формах.
 * Пример: <TextField label="API key" placeholder="sk-..." error={error} />.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, hint, error, leadingIcon, trailingSlot, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <label className={classNames(styles.field, className)} htmlFor={inputId}>
        {label ? <span className={styles.label}>{label}</span> : null}
        <span className={classNames(styles.control, error && styles.invalid)}>
          {leadingIcon ? <span className={styles.icon}>{leadingIcon}</span> : null}
          <input ref={ref} id={inputId} className={styles.input} aria-invalid={Boolean(error)} {...props} />
          {trailingSlot ? <span className={styles.trailing}>{trailingSlot}</span> : null}
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

TextField.displayName = 'TextField';
