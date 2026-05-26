import type {
  AgentInstructionSource,
  AgentMode,
  AgentPromptConfig,
  Chat,
  ChatMessage,
  CompactPreviousChat
} from '../../../shared/types';

/**
 * Что это: props списка сообщений чата.
 * Зачем нужно: MessageList является композиционным виджетом и принимает все данные,
 * необходимые для истории, sticky-инструкций, статуса активности и compacted-секции.
 */
export type MessageListProps = {
  messages: ChatMessage[];
  previousChat?: CompactPreviousChat;
  compactedAt?: number;
  tools: string[];
  activeMode: AgentMode | undefined;
  instructionSources: AgentInstructionSource[];
  promptConfig: AgentPromptConfig;
  busy: boolean;
  activity: Chat['activity'];
  activityDetail?: string;
  bottomOffset?: 'none' | 'composer';
  resolvedApprovalId?: string;
  /** Кнопки действий (список чатов, открыть в новой вкладке), рендерятся рядом с плавающей кнопкой инструкций */
  headerActions?: React.ReactNode;
};

/**
 * Что это: нормализованная единица рендера истории.
 * Зачем нужно: tool-call сообщения группируются отдельно от обычных сообщений,
 * чтобы после ответа ассистента их можно было свернуть одним cut-блоком.
 */
export type MessageGroup =
  | { type: 'single'; message: ChatMessage }
  | {
      type: 'toolCalls';
      id: string;
      userMessage?: ChatMessage;
      assistantMessage?: ChatMessage;
      tools: ChatMessage[];
      active: boolean;
    };

/**
 * Что это: props секции предыдущего чата после compaction.
 * Зачем нужно: история до сжатия рендерится как read-only блок с разделителем.
 */
export type PreviousChatHistoryProps = {
  chat: CompactPreviousChat;
  compactedAt?: number;
};
