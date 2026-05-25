import type { ChatMessage } from '../../../shared/types';

/**
 * Что это: props сворачиваемого блока tool-call сообщений.
 * Зачем нужно: компонент группирует инструменты одного пользовательского запроса и знает,
 * когда блок должен быть раскрыт автоматически.
 */
export type ToolCallsCutProps = {
  tools: ChatMessage[];
  userMessage?: ChatMessage;
  assistantMessage?: ChatMessage;
  active: boolean;
  resolvedApprovalId?: string;
};

/**
 * Что это: props заголовка cut-блока.
 * Зачем нужно: заголовок отделён от тела, чтобы логика списка инструментов не смешивалась с кнопкой раскрытия.
 */
export type ToolCallsCutHeaderProps = {
  open: boolean;
  meta: string;
  onToggle(): void;
};
