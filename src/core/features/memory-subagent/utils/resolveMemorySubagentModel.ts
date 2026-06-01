import type { MemorySubagentModelSettings } from '../types';

/**
 * Что это: выбирает модель для субагента памяти.
 * Зачем нужно: если пользователь не настроил отдельную модель, анализ памяти работает на модели текущего чата без дополнительных настроек.
 */
export function resolveMemorySubagentModel(input: {
  chatModel: string;
  settings?: MemorySubagentModelSettings;
}): string {
  return input.settings?.model?.trim() || input.chatModel;
}
