import { assertRepositoryId, listDirectoryNames, pathExists } from '../../../shared/lib/fileRepository';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import { getChatMetaPath } from './getChatMetaPath';

/**
 * Что это: список валидных chat id из файлового хранилища.
 * Зачем нужно: rebuild index должен идти от фактических директорий, а не от потенциально битого index.json.
 * Какую продуктовую проблему решает: повреждение индекса не приводит к потере пользовательских чатов.
 */
export async function listChatIds({ context }: { context: ChatRepositoryContext }): Promise<string[]> {
  const directoryNames = await listDirectoryNames(context.rootPath);
  const chatIds: string[] = [];

  for (const directoryName of directoryNames) {
    const chatId = assertRepositoryId(directoryName, 'chat');
    if (await pathExists(getChatMetaPath({ context, chatId }))) {
      chatIds.push(chatId);
    }
  }

  return chatIds.sort();
}
