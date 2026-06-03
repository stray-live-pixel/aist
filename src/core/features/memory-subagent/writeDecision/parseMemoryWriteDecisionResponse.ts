import {
  MEMORY_TOTAL_NOTE_CHARS_LIMIT,
  getMemoryTotalNoteChars,
  normalizeMemoryImportance,
  sanitizeMemoryNote
} from '../../../entities/memory/memory';
import { contentToText } from '../../../entities/model/contentToText';
import { parseJsonObject } from '../../../shared/subagents/utils/parseJsonObject';
import type { OpenRouterMessage } from '../../../shared/types/types';
import type { MemoryWriteDecisionInput } from '../types';
import type { MemoryWriteDecision } from '../types/MemoryWriteDecision';

/**
 * Что это: валидирует JSON-решение модели о записи памяти.
 * Зачем нужно: модель может вернуть неверный scope, пустой текст или замену, которая не соблюдает лимит.
 * Какую продуктовую проблему решает: автоматическая память применяет только безопасные и консистентные решения.
 */
export function parseMemoryWriteDecisionResponse(input: {
  response: OpenRouterMessage;
  decisionInput: MemoryWriteDecisionInput;
}): MemoryWriteDecision {
  const parsed = parseJsonObject({ content: contentToText({ content: input.response.content }) });
  const action = typeof parsed?.action === 'string' ? parsed.action : 'reject';
  const reason = typeof parsed?.reason === 'string' ? parsed.reason.slice(0, 500) : undefined;

  if (action !== 'add' && action !== 'replace') {
    return { action: 'reject', reason };
  }

  const scope =
    parsed?.scope === 'global' || parsed?.scope === 'project' ? parsed.scope : input.decisionInput.candidate.scope;
  const note = sanitizeMemoryNote(typeof parsed?.note === 'string' ? parsed.note : input.decisionInput.candidate.note);
  if (!note) {
    return { action: 'reject', reason: reason || 'Заметка не прошла санитарную проверку.' };
  }

  const importance = normalizeMemoryImportance({
    value: parsed?.importance,
    fallback: input.decisionInput.candidate.importance ?? 50
  });

  if (action === 'replace') {
    const replaceItemId = typeof parsed?.replaceItemId === 'string' ? parsed.replaceItemId : '';
    const replaceItem = input.decisionInput.memoryItems.find(
      (item) => item.id === replaceItemId && item.scope === scope
    );
    if (!replaceItem) {
      return { action: 'reject', reason: reason || 'Модель не указала корректную заметку для замены.' };
    }

    if (!fitsLimitAfterReplace({ input: input.decisionInput, note, replaceItemId })) {
      return { action: 'reject', reason: reason || 'Замена не укладывается в лимит памяти.' };
    }

    return { action: 'replace', scope, note, importance, replaceItemId, reason };
  }

  if (!fitsLimitAfterAdd({ input: input.decisionInput, note })) {
    return { action: 'reject', reason: reason || 'Добавление превысит лимит памяти.' };
  }

  return { action: 'add', scope, note, importance, reason };
}

/** Проверяет лимит при простом добавлении заметки. */
function fitsLimitAfterAdd(input: { input: MemoryWriteDecisionInput; note: string }): boolean {
  return (
    getMemoryTotalNoteChars({ items: input.input.memoryItems }) + input.note.length <= MEMORY_TOTAL_NOTE_CHARS_LIMIT
  );
}

/** Проверяет лимит при замене одной старой заметки на новую. */
function fitsLimitAfterReplace(input: {
  input: MemoryWriteDecisionInput;
  note: string;
  replaceItemId: string;
}): boolean {
  const nextItems = input.input.memoryItems.filter((item) => item.id !== input.replaceItemId);
  return getMemoryTotalNoteChars({ items: nextItems }) + input.note.length <= MEMORY_TOTAL_NOTE_CHARS_LIMIT;
}
