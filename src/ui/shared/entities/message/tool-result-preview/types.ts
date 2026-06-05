import type { ChatMessage } from '../../../types';

/**
 * Что это: props компонента ToolResultPreview.
 * Зачем нужно: человекочитаемый preview результата tool-call.
 */
export type ToolResultPreviewProps = {
  /** Сообщение tool-call с результатом для отображения. */
  message: ChatMessage;
};

/**
 * Что это: факт о bash-скрипте для отображения в dl-списке.
 * Зачем нужно: cwd, exit code, duration — каждый факт имеет свой тон (ok/error/running).
 */
export type BashFact = {
  label: string;
  value: string;
  tone?: 'ok' | 'error' | 'running';
};
