import type { AgentMemoryScope } from '../../../entities/memory/memory';

/**
 * Что это: решение AI-субагента о новой заметке памяти.
 * Зачем нужно: перед записью память проверяет полезность, вес и возможную замену старой заметки.
 * Какую продуктовую проблему решает: автоматическая память остаётся компактной и не копит мусорные факты.
 */
export type MemoryWriteDecision =
  | {
      action: 'add';
      scope: AgentMemoryScope;
      note: string;
      importance: number;
      reason?: string;
    }
  | {
      action: 'replace';
      scope: AgentMemoryScope;
      note: string;
      importance: number;
      replaceItemId: string;
      reason?: string;
    }
  | {
      action: 'reject';
      reason?: string;
    };
