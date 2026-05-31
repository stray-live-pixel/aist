import type { AgentMemoryItem } from '../../entities/memory/memory';
import type { ChatMessage, ReasoningEffort } from '../../shared/types/types';

/**
 * Что это: настройки модели для субагента памяти.
 * Зачем нужно: пользователь может оставить модель текущего чата или явно выбрать отдельную модель для анализа памяти.
 */
export type MemorySubagentModelSettings = {
  model?: string;
  reasoningEffort?: ReasoningEffort;
};

/**
 * Что это: запрос на подбор заметок памяти перед ответом агента.
 * Зачем нужно: субагент получает текущий вопрос, историю и все доступные заметки, чтобы выбрать только полезные сейчас.
 */
export type MemorySelectionInput = {
  prompt: string;
  chatHistory: ChatMessage[];
  memoryItems: AgentMemoryItem[];
  chatModel: string;
  settings?: MemorySubagentModelSettings;
};

/**
 * Что это: результат AI-подбора памяти.
 * Зачем нужно: runtime получает уже отобранные заметки и может добавить их в контекст модели как отдельный блок.
 */
export type MemorySelectionResult = {
  items: AgentMemoryItem[];
  reason?: string;
  source: 'ai' | 'fallback';
};

/**
 * Что это: запрос на анализ завершённого чата для новых заметок.
 * Зачем нужно: пользователь вручную запускает помощника, который предлагает новые знания для памяти.
 */
export type MemoryAnalysisInput = {
  chatId: string;
  messages: ChatMessage[];
  memoryItems: AgentMemoryItem[];
  chatModel: string;
  settings?: MemorySubagentModelSettings;
};
