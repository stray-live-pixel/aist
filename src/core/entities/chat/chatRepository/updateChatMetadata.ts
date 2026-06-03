import { removeUndefined } from '../../../shared/lib/fileRepository';
import type { Chat } from '../../../shared/types/types';
import type { ChatMetadataPatch } from './ChatMetadataPatch';
import type { ChatRepositoryContext } from './ChatRepositoryContext';
import type { StoredChatMeta } from './StoredChatMeta';
import { normalizeUsage } from './normalizeUsage';
import { requireChat } from './requireChat';
import { requireChatMeta } from './requireChatMeta';
import { upsertChatIndexSummary } from './upsertChatIndexSummary';
import { writeChatMeta } from './writeChatMeta';

/**
 * Что это: обновление persisted-метаданных чата.
 * Зачем нужно: title/model/usage/lastAnswer меняются без переписывания сообщений.
 * Какую продуктовую проблему решает: карточка чата обновляется быстро и не рискует потерять историю.
 */
export async function updateChatMetadata({
  context,
  chatId,
  patch
}: {
  context: ChatRepositoryContext;
  chatId: string;
  patch: ChatMetadataPatch;
}): Promise<Chat> {
  const meta = await requireChatMeta({ context, chatId });
  const nextMeta = buildNextMeta({ meta, patch, now: context.now() });

  await writeChatMeta({ context, meta: nextMeta });
  const updatedChat = await requireChat({ context, chatId });
  await upsertChatIndexSummary({ context, chat: updatedChat });
  return updatedChat;
}

/**
 * Что это: merge patch-данных в meta.json.
 * Зачем нужно: undefined-поля должны очищать optional-значения, а usage проходить нормализацию.
 * Какую продуктовую проблему решает: обновления разных частей UI не оставляют неконсистентные поля.
 */
function buildNextMeta({
  meta,
  patch,
  now
}: {
  meta: StoredChatMeta;
  patch: ChatMetadataPatch;
  now: number;
}): StoredChatMeta {
  return removeUndefined({
    ...meta,
    ...patch,
    usage: patch.usage ? normalizeUsage({ usage: patch.usage }) : meta.usage,
    updatedAt: now
  });
}
