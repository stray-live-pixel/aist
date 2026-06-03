import type { ReactNode } from 'react';

import type { AgentAttachment } from '../../shared/types';

/**
 * Что это: публичные props composer ввода сообщения.
 * Зачем нужно: composer сам держит текст prompt и IPC-отправку, а родитель передаёт только состояние выполнения и слотные элементы окружения.
 */
export type ComposerProps = {
  /** Идентификатор чата, для которого composer отправляет prompt и stop. */
  chatId: string;
  /** Идёт ли сейчас генерация; в этом режиме кнопка отправляет stop вместо ask. */
  busy: boolean;
  /** Включает sticky/floating layout для закрепления у нижнего края webview. */
  floating?: boolean;
  /** Сворачивает composer в компактную полоску, когда агент занят и окно не в фокусе. */
  minimized?: boolean;
  /** Включает анимированный градиент на свернутой полоске во время работы агента. */
  gradientWhileBusy?: boolean;
  /** Вызывается перед IPC-отправкой prompt, чтобы родитель мог мгновенно показать pending-состояние. */
  onSubmitPrompt?(
    prompt: string,
    options?: { continueWithoutUserPrompt?: boolean; attachments?: AgentAttachment[] }
  ): void;
  /** Вызывается при stop, чтобы родитель мог сразу показать состояние остановки. */
  onStopRequested?(): void;
  /** Слот кратких настроек агента над textarea. */
  settings?: ReactNode;
  /** Слот дополнительных действий справа в верхней строке composer. */
  headerActions?: ReactNode;
  /** Слот дополнительных действий/метаданных слева в нижней строке. */
  footer?: ReactNode;
  /** Слот быстрых controls после скрепки, например переключатель Turbo tools. */
  footerControls?: ReactNode;
  /** Слот предупреждения над composer, например про недоступные настройки. */
  notice?: ReactNode;
};
