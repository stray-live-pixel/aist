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
import { getChatHistoryPath } from './getChatHistoryPath';
import { getChatMessagesPath } from './getChatMessagesPath';
import { getChatPath } from './getChatPath';
import { normalizeModelSettings } from './normalizeModelSettings';
import { normalizeState } from './normalizeState';
import { normalizeUsage } from './normalizeUsage';
import { replaceChatJsonl } from './replaceChatJsonl';
import { updateChatIndexAfterCreate } from './updateChatIndexAfterCreate';
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

  const meta = createInitialMeta({ context, input, chatId, now });
  const state = normalizeState({ state: input.state });
  const chat = createInitialChat({ meta, state });

  await safeMkdir(chatPath);
  await writeChatMeta({ context, meta });
  await writeChatState({ context, chatId, state });
  await replaceChatJsonl({ context, chatId, fileName: 'messages.jsonl', entries: [] });
  await replaceChatJsonl({ context, chatId, fileName: 'history.jsonl', entries: [] });

  for (const message of input.messages || []) {
    const chatMessage = createChatMessage({ context, message, now });
    chat.messages.push(chatMessage);
    await appendJsonl(getChatMessagesPath({ context, chatId }), chatMessage);
  }

  for (const historyMessage of input.history || []) {
    chat.history.push(historyMessage);
    await appendJsonl(getChatHistoryPath({ context, chatId }), historyMessage);
  }

  await updateChatIndexAfterCreate({ context, chat });
  return chat;
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

/**
 * Что это: собирает возвращаемый Chat из уже записываемых meta/state данных.
 * Зачем нужно: createChat не перечитывает только что созданные файлы и не замедляет кнопку «Новый чат».
 * Какую продуктовую проблему решает: UI получает созданный чат быстро, а FS всё равно остаётся источником правды.
 */
function createInitialChat({ meta, state }: { meta: StoredChatMeta; state: ReturnType<typeof normalizeState> }): Chat {
  return {
    id: meta.id,
    title: meta.title,
    model: meta.model,
    modelSettings: normalizeModelSettings({ value: meta.modelSettings, fallbackModel: meta.model }),
    previousChatId: meta.previousChatId,
    compactedAt: meta.compactedAt,
    compactionModel: meta.compactionModel,
    vcs: meta.vcs,
    messages: [],
    history: [],
    lastAnswer: meta.lastAnswer,
    activity: state.activity,
    activityDetail: state.activityDetail,
    modelRequest: state.modelRequest,
    busy: state.busy,
    context: state.context,
    contextLength: state.contextLength,
    activePlan: state.activePlan,
    reflectionCandidates: state.reflectionCandidates,
    usage: meta.usage,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt
  };
}
