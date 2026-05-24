import { type InputHTMLAttributes, forwardRef, useId } from 'react';

import { classNames } from '../lib/classNames';
import styles from './Switch.module.scss';

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  description?: string;
};

/**
 * Что это: switch для быстрых on/off настроек.
 * Зачем нужно: компактный macOS-like переключатель для режимов и разрешений.
 * Пример: <Switch label="Auto mode" defaultChecked />.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <label className={classNames(styles.switch, className)} htmlFor={inputId}>
        <span className={styles.text}>
          <span className={styles.label}>{label}</span>
          {description ? <span className={styles.description}>{description}</span> : null}
        </span>
        <span className={styles.trackWrap}>
          <input ref={ref} id={inputId} className={styles.input} type="checkbox" {...props} />
          <span className={styles.track} aria-hidden="true">
            <span className={styles.thumb} />
          </span>
        </span>
      </label>
    );
  }
);

Switch.displayName = 'Switch';
