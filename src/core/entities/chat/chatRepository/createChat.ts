import {
  FileRepositoryError,
  assertRepositoryId,
  pathExists,
  removeUndefined
} from '../../../shared/lib/fileRepository';
import type { Chat } from '../../../shared/types/types';
import { appendJsonl, safeMkdir } from '../../storage/storage';
import { CHAT_SCHEMA_VERSION } from './CHAT_SCHEMA_VERSION';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import type { CreateChatInput } from './CreateChatInput';
import { DEFAULT_TITLE } from './DEFAULT_TITLE';
import type { StoredChatMeta } from './StoredChatMeta';
import { createChatMessage } from './createChatMessage';
import { getChat } from './getChat';
import { getChatHistoryPath } from './getChatHistoryPath';
import { getChatMessagesPath } from './getChatMessagesPath';
import { getChatPath } from './getChatPath';
import { normalizeModelSettings } from './normalizeModelSettings';
import { normalizeState } from './normalizeState';
import { normalizeUsage } from './normalizeUsage';
import { rebuildChatIndex } from './rebuildChatIndex';
import { replaceChatJsonl } from './replaceChatJsonl';
import { writeChatMeta } from './writeChatMeta';
import { writeChatState } from './writeChatState';

/**
 * Что это: создание нового чата со всеми persisted-файлами.
 * Зачем нужно: meta/state/messages/history должны появляться как единый стартовый набор.
 * Какую продуктовую проблему решает: новый диалог сразу можно открыть, продолжить и восстановить после restart.
 */
export async function createChat({
  context,
  input
}: {
  context: ChatRepositoryContext;
  input: CreateChatInput;
}): Promise<Chat> {
  const now = context.now();
  const chatId = assertRepositoryId(input.id || context.idFactory(), 'chat');
  const chatPath = getChatPath({ context, chatId });

  if (await pathExists(chatPath)) {
    throw new FileRepositoryError('repository.conflict', `Chat already exists: ${chatId}`, { id: chatId });
  }

  await safeMkdir(chatPath);
  await writeChatMeta({ context, meta: createInitialMeta({ context, input, chatId, now }) });
  await writeChatState({ context, chatId, state: normalizeState({ state: input.state }) });
  await replaceChatJsonl({ context, chatId, fileName: 'messages.jsonl', entries: [] });
  await replaceChatJsonl({ context, chatId, fileName: 'history.jsonl', entries: [] });

  for (const message of input.messages || []) {
    await appendJsonl(getChatMessagesPath({ context, chatId }), createChatMessage({ context, message, now }));
  }

  for (const historyMessage of input.history || []) {
    await appendJsonl(getChatHistoryPath({ context, chatId }), historyMessage);
  }

  await rebuildChatIndex({ context });
  return (await getChat({ context, chatId }))!;
}

/**
 * Что это: сборка стартовых метаданных чата.
 * Зачем нужно: create остаётся сценарным оркестратором, а формат meta.json описан в одном месте.
 * Какую продуктовую проблему решает: новые поля чата проще добавлять без риска сломать создание диалога.
 */
function createInitialMeta({
  context,
  input,
  chatId,
  now
}: {
  context: ChatRepositoryContext;
  input: CreateChatInput;
  chatId: string;
  now: number;
}): StoredChatMeta {
  return removeUndefined({
    schemaVersion: CHAT_SCHEMA_VERSION,
    id: chatId,
    title: input.title || DEFAULT_TITLE,
    model: input.model,
    modelSettings: normalizeModelSettings({ value: input.modelSettings, fallbackModel: input.model }),
    previousChatId: input.previousChatId,
    compactedAt: input.compactedAt,
    compactionModel: input.compactionModel,
    vcs: input.vcs,
    lastAnswer: input.lastAnswer || '',
    usage: normalizeUsage({ usage: input.usage }),
    createdAt: now || context.now(),
    updatedAt: now || context.now()
  });
}
