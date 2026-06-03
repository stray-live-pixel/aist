import { FileRepositoryError, readJsonFile } from '../../../shared/lib/fileRepository';
import { CHAT_SCHEMA_VERSION } from './CHAT_SCHEMA_VERSION';
import type { StoredChatIndex } from './StoredChatIndex';

/**
 * Что это: best-effort чтение текущего index.json без сверки с директориями чатов.
 * Зачем нужно: точечный update/delete сам знает изменённый chatId и не должен делать list всех чатов на happy path.
 * Какую продуктовую проблему решает: single-chat операции обновляют индекс без полного обхода storage.
 */
export async function readExistingChatIndex({
  indexPath
}: {
  indexPath: string;
}): Promise<StoredChatIndex | undefined> {
  try {
    const index = await readJsonFile<StoredChatIndex>(indexPath);
    return index?.schemaVersion === CHAT_SCHEMA_VERSION && Array.isArray(index.chats) ? index : undefined;
  } catch (error) {
    if (error instanceof FileRepositoryError && error.code === 'repository.invalidJson') {
      return undefined;
    }

    throw error;
  }
}
