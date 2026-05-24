import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';

import { classNames } from '../lib/classNames';
import styles from './Button.module.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
};

/**
 * Что это: базовая кнопка дизайн-системы для действий в webview.
 * Зачем нужно: единый macOS-like стиль, состояния и размеры вместо разрозненных классов.
 * Пример: <Button variant="primary" leadingIcon={<Plus />}>Create</Button>.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'secondary', size = 'md', leadingIcon, trailingIcon, fullWidth, className, children, ...props },
    ref
  ) => (
    <button
      ref={ref}
      className={classNames(styles.button, styles[variant], styles[size], fullWidth && styles.fullWidth, className)}
      {...props}
    >
      {leadingIcon ? <span className={styles.icon}>{leadingIcon}</span> : null}
      <span className={styles.content}>{children}</span>
      {trailingIcon ? <span className={styles.icon}>{trailingIcon}</span> : null}
    </button>
  )
);

Button.displayName = 'Button';
