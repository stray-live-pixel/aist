import { type TextareaHTMLAttributes, forwardRef, useId } from 'react';

import { classNames } from '../lib/classNames';
import styles from './TextArea.module.scss';

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

/**
 * Что это: универсальная textarea для длинного текста.
 * Зачем нужно: единый стиль больших полей, подсказок и ошибок в настройках и composer-like формах.
 * Пример: <TextArea label="Instructions" rows={6} />.
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, hint, error, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <label className={classNames(styles.field, className)} htmlFor={inputId}>
        {label ? <span className={styles.label}>{label}</span> : null}
        <textarea
          ref={ref}
          id={inputId}
          className={classNames(styles.textarea, error && styles.invalid)}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error ? (
          <span className={styles.error}>{error}</span>
        ) : hint ? (
          <span className={styles.hint}>{hint}</span>
        ) : null}
      </label>
    );
  }
);

TextArea.displayName = 'TextArea';
