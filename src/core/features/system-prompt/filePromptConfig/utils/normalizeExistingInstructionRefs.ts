import type { FilePromptInstruction, FilePromptItemRef } from '../types';
import { normalizeItemRefs } from './normalizeItemRefs';

/**
 * Что это: оставляет только активные ссылки на реально существующие инструкции.
 * Зачем нужно: если пользователь удалил инструкцию из библиотеки, daemon не должен отправлять в prompt пустые или устаревшие refs.
 */
export function normalizeExistingInstructionRefs(params: {
  raw: unknown;
  instructions: FilePromptInstruction[];
}): FilePromptItemRef[] {
  return normalizeItemRefs({ raw: params.raw }).filter((ref) =>
    params.instructions.some((item) => item.scope === ref.scope && item.id === ref.id)
  );
}
