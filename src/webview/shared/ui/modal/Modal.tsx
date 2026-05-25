import type { HTMLAttributes, ReactNode } from 'react';

import { classNames } from '../lib/classNames';
import styles from './Modal.module.scss';

export type ModalTone = 'default' | 'approval' | 'error';
export type ModalSize = 'default' | 'settings';

type ModalBackdropProps = HTMLAttributes<HTMLDivElement> & {
  tone?: ModalTone;
};

type ModalSurfaceProps = HTMLAttributes<HTMLElement> & {
  tone?: ModalTone;
  size?: ModalSize;
  children: ReactNode;
};

type ModalHeaderProps = HTMLAttributes<HTMLElement> & {
  tone?: ModalTone;
  children: ReactNode;
};

type ModalCodeProps = HTMLAttributes<HTMLPreElement> & {
  tone?: ModalTone;
  children: ReactNode;
};

/**
 * Что это: backdrop модалки поверх webview.
 * Зачем нужно: заменяет глобальный `tool-modal-backdrop`, но сохраняет общий визуальный контракт для всех модалок.
 */
export function ModalBackdrop({ tone = 'default', className, ...props }: ModalBackdropProps) {
  return (
    <div
      className={classNames(styles.backdrop, tone === 'approval' && styles.approvalBackdrop, className)}
      {...props}
    />
  );
}

/**
 * Что это: контейнер модалки с вариантами размера и тона.
 * Зачем нужно: App/chat/settings больше не зависят от глобальных CSS-классов `tool-modal*`.
 */
export function ModalSurface({ tone = 'default', size = 'default', className, children, ...props }: ModalSurfaceProps) {
  return (
    <section
      className={classNames(
        styles.modal,
        tone === 'approval' && styles.approvalModal,
        tone === 'error' && styles.errorModal,
        size === 'settings' && styles.settingsModal,
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

/**
 * Что это: общий header модалки.
 * Зачем нужно: заголовки error/approval/settings должны иметь одинаковые отступы и типографику.
 */
export function ModalHeader({ tone = 'default', className, children, ...props }: ModalHeaderProps) {
  return (
    <header
      className={classNames(
        styles.header,
        tone === 'approval' && styles.approvalHeader,
        tone === 'error' && styles.errorHeader,
        className
      )}
      {...props}
    >
      {children}
    </header>
  );
}

/**
 * Что это: pre-блок для длинного текста модалки.
 * Зачем нужно: error modal показывает stack/message с переносами и общими scroll-правилами.
 */
export function ModalCode({ tone = 'default', className, children, ...props }: ModalCodeProps) {
  return (
    <pre className={classNames(styles.code, tone === 'error' && styles.errorCode, className)} {...props}>
      {children}
    </pre>
  );
}
