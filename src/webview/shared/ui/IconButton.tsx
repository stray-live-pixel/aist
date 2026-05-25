import type { ReactNode } from 'react';

import styles from './IconButton.module.scss';

type IconButtonProps = {
  title: string;
  children: ReactNode;
  disabled?: boolean;
  onClick(): void;
};

/**
 * Что это: квадратная икон-кнопка для compact actions.
 * Зачем нужно: раньше стиль жил в global CSS, теперь кнопка самодостаточна и не держит app/styles.css от очистки.
 */
export function IconButton({ title, children, disabled, onClick }: IconButtonProps) {
  return (
    <button className={styles.root} title={title} aria-label={title} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
