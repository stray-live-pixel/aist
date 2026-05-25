import type { ReactNode } from 'react';

import type { ChatMessage, ChatMessageUsageEstimate } from '../../../shared/types';

/**
 * Что это: сигнатура функции форматирования даты сообщения.
 * Зачем нужно: тип используется в нескольких компонентах для единообразия.
 */
export type DateFormatter = (timestamp?: number) => ReactNode;

/**
 * Что это: сигнатура функции форматирования usage-информации.
 * Зачем нужно: MessageCard и ToolMessageCard используют разные форматы (inline vs pill).
 */
export type UsageFormatter = (usage?: ChatMessageUsageEstimate) => ReactNode;

/**
 * Что это: статус tool-call для локализации.
 * Зачем нужно: ToolStatusBadge и ToolMessageCard нуждаются в локализованной строке статуса.
 */
export type ToolStatusMessage = ChatMessage;
