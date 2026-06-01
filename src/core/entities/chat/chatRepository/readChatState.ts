import { readJsonFile } from '../../../shared/lib/fileRepository';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import type { StoredChatState } from './StoredChatState';
import { getChatStatePath } from './getChatStatePath';
import { normalizeState } from './normalizeState';

/**
 * Что это: чтение runtime-состояния чата с default-значениями.
 * Зачем нужно: state.json может отсутствовать у старых или очищенных чатов.
 * Какую продуктовую проблему решает: пользователь открывает старую историю без ручной миграции файлов.
 */
export async function readChatState({
  context,
  chatId
}: {
  context: ChatRepositoryContext;
  chatId: string;
}): Promise<StoredChatState> {
  const rawState = await readJsonFile<Partial<StoredChatState>>(getChatStatePath({ context, chatId }));
  return normalizeState({ state: rawState });
}
