import { type ReactNode, memo } from 'react';

import { classNames } from '../lib/classNames';
import styles from './ComposerFrame.module.scss';

export type ComposerFrameProps = {
  /** Включает floating-режим для закрепления composer поверх нижней части webview. */
  floating?: boolean;
  /** Контент предупреждения над рамкой composer; слот нужен для approval/notice без знания домена в shared. */
  notice?: ReactNode;
  /** Верхняя строка быстрых настроек; fallback остаётся внутри shared, чтобы фича не рисовала собственный текстовый UI. */
  header: ReactNode;
  /** Правая часть верхней строки с быстрыми действиями composer. */
  headerActions?: ReactNode;
  /** Основное поле ввода или другой центральный интерактивный элемент. */
  input: ReactNode;
  /** Левая часть нижней строки с метаданными и controls. */
  footer?: ReactNode;
  /** Правая часть нижней строки, обычно shortcut и кнопка отправки. */
  actions: ReactNode;
  /** Текст fallback для случая, когда верхний слот пуст. */
  fallback?: string;
  className?: string;
};

/**
 * Что это: shared-рамка composer с верхним слотом, input-областью и нижней строкой действий.
 * Зачем нужно: визуальная оболочка composer переиспользуема и не должна жить в feature-компоненте отправки сообщения.
 */
export const ComposerFrame = memo(function ComposerFrame({
  floating = false,
  notice,
  header,
  headerActions,
  input,
  footer,
  actions,
  fallback,
  className
}: ComposerFrameProps) {
  return (
    <footer className={classNames(styles.root, floating && styles.floating, className)}>
      {notice ? <div className={styles.notice}>{notice}</div> : null}
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerContent}>{header || <span className={styles.fallback}>{fallback}</span>}</div>
          {headerActions ? <div className={styles.headerActions}>{headerActions}</div> : null}
        </div>
        <ComposerFrameDivider />
        {input}
        <ComposerFrameDivider />
        <div className={styles.actions}>
          <div className={styles.footer}>{footer}</div>
          <div className={styles.sendActions}>{actions}</div>
        </div>
      </div>
    </footer>
  );
});

/**
 * Что это: внутренний shared-разделитель секций composer.
 * Зачем нужно: фича не должна знать, как визуально отделяются области рамки.
 */
const ComposerFrameDivider = memo(function ComposerFrameDivider() {
  return <div className={styles.divider} />;
});
