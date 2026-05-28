import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  FileRepositoryError,
  assertRepositoryId,
  childPath,
  listDirectoryNames,
  pathExists,
  readJsonFile,
  readJsonlFile,
  removeUndefined,
  sortByUpdatedAtDesc
} from './fileRepository';
import { appendJsonl, safeMkdir, workspaceChatsDir, writeJsonAtomic } from './storage';
import type {
  AgentReflectionCandidate,
  Chat,
  ChatContextEstimate,
  ChatMessage,
  ChatModelRequestStatus,
  ChatPlan,
  ChatSummary,
  ChatUsageEstimate,
  OpenRouterMessage
} from './types';

const CHAT_SCHEMA_VERSION = 1;
const DEFAULT_TITLE = 'New chat';

export type ChatRepositoryOptions = {
  workspaceRoot: string;
  idFactory?: () => string;
  now?: () => number;
};

export type CreateChatInput = {
  id?: string;
  title?: string;
  model: string;
  previousChatId?: string;
  compactedAt?: number;
  lastAnswer?: string;
  usage?: Partial<ChatUsageEstimate>;
  messages?: ChatMessageInput[];
  history?: OpenRouterMessage[];
  state?: ChatStatePatch;
};

export type ChatMetadataPatch = Partial<
  Pick<Chat, 'title' | 'model' | 'previousChatId' | 'compactedAt' | 'lastAnswer' | 'usage'>
>;

export type ChatStatePatch = Partial<
  Pick<
    Chat,
    | 'busy'
    | 'activity'
    | 'activityDetail'
    | 'modelRequest'
    | 'context'
    | 'contextLength'
    | 'activePlan'
    | 'reflectionCandidates'
  >
>;

export type ChatMessageInput = Omit<ChatMessage, 'id' | 'createdAt'> & Partial<Pick<ChatMessage, 'id' | 'createdAt'>>;

type StoredChatMeta = {
  schemaVersion: number;
  id: string;
  title: string;
  model: string;
  previousChatId?: string;
  compactedAt?: number;
  lastAnswer: string;
  usage: ChatUsageEstimate;
  createdAt: number;
  updatedAt: number;
};

type StoredChatState = {
  schemaVersion: number;
  busy: boolean;
  activity?: Chat['activity'];
  activityDetail?: string;
  modelRequest?: ChatModelRequestStatus;
  context?: ChatContextEstimate;
  contextLength?: number;
  activePlan?: ChatPlan;
  reflectionCandidates?: AgentReflectionCandidate[];
};

type StoredChatIndex = {
  schemaVersion: number;
  updatedAt: number;
  chats: ChatSummary[];
};

/**
 * File-backed source of truth for CLI chats.
 *
 * Инварианты:
 * - `meta.json`, `state.json` и `index.json` пишутся только atomic temp+rename.
 * - `messages.jsonl` и `history.jsonl` хранят текущую материализованную историю:
 *   append используется для новых записей, а runtime может переписать файл для
 *   tool status updates, clear и context compaction.
 * - `index.json` ускоряет списки, но rebuild всегда идёт из каталогов chat,
 *   поэтому повреждение index не теряет пользовательские сообщения.
 * - Secrets сюда не принимаются: repository пишет только chat metadata, UI
 *   messages, compact model history и runtime state.
 */
export class ChatRepository {
  readonly rootPath: string;
  private readonly idFactory: () => string;
  private readonly now: () => number;

  constructor(options: ChatRepositoryOptions) {
    this.rootPath = workspaceChatsDir(options.workspaceRoot);
    this.idFactory = options.idFactory || randomUUID;
    this.now = options.now || Date.now;
  }

  async create(input: CreateChatInput): Promise<Chat> {
    const now = this.now();
    const chatId = assertRepositoryId(input.id || this.idFactory(), 'chat');
    const chatPath = this.chatPath(chatId);
    if (await pathExists(chatPath)) {
      throw new FileRepositoryError('repository.conflict', `Chat already exists: ${chatId}`, { id: chatId });
    }

    await safeMkdir(chatPath);
    const meta: StoredChatMeta = removeUndefined({
      schemaVersion: CHAT_SCHEMA_VERSION,
      id: chatId,
      title: input.title || DEFAULT_TITLE,
      model: input.model,
      previousChatId: input.previousChatId,
      compactedAt: input.compactedAt,
      lastAnswer: input.lastAnswer || '',
      usage: normalizeUsage(input.usage),
      createdAt: now,
      updatedAt: now
    });
    await this.writeMeta(meta);
    await this.writeState(chatId, normalizeState(input.state));
    await this.replaceJsonl(chatId, 'messages.jsonl', []);
    await this.replaceJsonl(chatId, 'history.jsonl', []);

    for (const message of input.messages || []) {
      await appendJsonl(this.messagesPath(chatId), this.createMessage(message, now));
    }

    for (const historyMessage of input.history || []) {
      await appendJsonl(this.historyPath(chatId), historyMessage);
    }

    await this.rebuildIndex();
    return (await this.get(chatId))!;
  }

  async list(): Promise<ChatSummary[]> {
    if (!(await pathExists(this.rootPath))) {
      return [];
    }

    const index = await this.readUsableIndex();
    if (index) {
      return sortSummaries(index.chats);
    }

    return this.rebuildIndex();
  }

  async get(chatId: string): Promise<Chat | undefined> {
    const safeChatId = assertRepositoryId(chatId, 'chat');
    const meta = await readJsonFile<StoredChatMeta>(this.metaPath(safeChatId));
    if (!meta) {
      return undefined;
    }

    return this.readChatFromMeta(meta);
  }

  async update(chatId: string, patch: ChatMetadataPatch): Promise<Chat> {
    const meta = await this.requireMeta(chatId);
    const now = this.now();
    const nextMeta: StoredChatMeta = removeUndefined({
      ...meta,
      ...patch,
      usage: patch.usage ? normalizeUsage(patch.usage) : meta.usage,
      updatedAt: now
    });

    await this.writeMeta(nextMeta);
    await this.rebuildIndex();
    return this.requireChat(chatId);
  }

  async clear(chatId: string): Promise<Chat> {
    const meta = await this.requireMeta(chatId);
    const now = this.now();

    await this.writeMeta({
      ...meta,
      title: DEFAULT_TITLE,
      lastAnswer: '',
      usage: normalizeUsage(undefined),
      updatedAt: now
    });
    await this.writeState(meta.id, normalizeState(undefined));
    await this.replaceJsonl(meta.id, 'messages.jsonl', []);
    await this.replaceJsonl(meta.id, 'history.jsonl', []);
    await this.rebuildIndex();

    return this.requireChat(meta.id);
  }

  async delete(chatId: string): Promise<void> {
    const safeChatId = assertRepositoryId(chatId, 'chat');
    await fs.promises.rm(this.chatPath(safeChatId), { recursive: true, force: true });
    await this.rebuildIndex();
  }

  async updateState(chatId: string, patch: ChatStatePatch): Promise<Chat> {
    const meta = await this.requireMeta(chatId);
    const currentState = await this.readState(meta.id);
    await this.writeState(meta.id, normalizeState({ ...currentState, ...patch }));
    await this.touch(meta);
    await this.rebuildIndex();
    return this.requireChat(chatId);
  }

  async setBusy(chatId: string, busy: boolean): Promise<void> {
    await this.updateState(chatId, { busy });
  }

  async setActivity(chatId: string, activity: Chat['activity'], detail?: string): Promise<void> {
    await this.updateState(chatId, { activity, activityDetail: detail });
  }

  async setActivityDetail(chatId: string, detail: string | undefined): Promise<void> {
    await this.updateState(chatId, { activityDetail: detail });
  }

  async setModelRequest(chatId: string, modelRequest: ChatModelRequestStatus | undefined): Promise<void> {
    await this.updateState(chatId, { modelRequest });
  }

  async updateModelRequest(
    chatId: string,
    patch: Partial<NonNullable<Chat['modelRequest']>>
  ): Promise<ChatModelRequestStatus | undefined> {
    const chat = await this.requireChat(chatId);
    if (!chat.modelRequest) {
      return undefined;
    }

    const nextRequest = { ...chat.modelRequest, ...patch };
    await this.updateState(chatId, { modelRequest: nextRequest });
    return nextRequest;
  }

  async setContext(chatId: string, context: ChatContextEstimate | undefined): Promise<void> {
    await this.updateState(chatId, { context, contextLength: context?.tokens });
  }

  async setActivePlan(chatId: string, activePlan: ChatPlan | undefined): Promise<void> {
    await this.updateState(chatId, { activePlan });
  }

  async addReflectionCandidates(chatId: string, candidates: AgentReflectionCandidate[]): Promise<void> {
    if (!candidates.length) {
      return;
    }

    const chat = await this.requireChat(chatId);
    await this.updateState(chatId, {
      reflectionCandidates: [...(chat.reflectionCandidates || []), ...candidates]
    });
  }

  async appendMessage(chatId: string, message: ChatMessageInput): Promise<ChatMessage> {
    const meta = await this.requireMeta(chatId);
    const now = this.now();
    const nextMessage = this.createMessage(message, now);

    await appendJsonl(this.messagesPath(meta.id), nextMessage);
    const title =
      meta.title === DEFAULT_TITLE && nextMessage.role === 'user' && nextMessage.content
        ? toSingleLinePreview(nextMessage.content, 50) || meta.title
        : meta.title;
    await this.writeMeta({ ...meta, title, updatedAt: now });
    await this.rebuildIndex();
    return nextMessage;
  }

  async updateMessage(
    chatId: string,
    messageId: string,
    patch: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>
  ): Promise<ChatMessage> {
    const meta = await this.requireMeta(chatId);
    const messages = await readJsonlFile<ChatMessage>(this.messagesPath(meta.id));
    const index = messages.findIndex((message) => message.id === messageId);
    if (index === -1) {
      throw new FileRepositoryError('repository.readFailed', `Message not found: ${messageId}`, {
        id: messageId
      });
    }

    const nextMessage = { ...messages[index], ...patch };
    messages[index] = nextMessage;
    await this.replaceJsonl(meta.id, 'messages.jsonl', messages);
    await this.touch(meta);
    await this.rebuildIndex();
    return nextMessage;
  }

  async appendHistory(chatId: string, message: OpenRouterMessage): Promise<void> {
    const meta = await this.requireMeta(chatId);
    await appendJsonl(this.historyPath(meta.id), message);
    await this.touch(meta);
    await this.rebuildIndex();
  }

  async appendHistoryBatch(chatId: string, messages: OpenRouterMessage[]): Promise<void> {
    const meta = await this.requireMeta(chatId);
    for (const message of messages) {
      await appendJsonl(this.historyPath(meta.id), message);
    }
    await this.touch(meta);
    await this.rebuildIndex();
  }

  async setHistory(chatId: string, history: OpenRouterMessage[]): Promise<void> {
    const meta = await this.requireMeta(chatId);
    await this.replaceJsonl(meta.id, 'history.jsonl', history);
    await this.touch(meta);
    await this.rebuildIndex();
  }

  async setLastAnswer(chatId: string, answer: string): Promise<void> {
    await this.update(chatId, { lastAnswer: answer });
  }

  async addUsage(chatId: string, usage: Partial<ChatUsageEstimate>): Promise<ChatUsageEstimate> {
    const chat = await this.requireChat(chatId);
    const currentCost = chat.usage.costUsd;
    const nextCost =
      currentCost === undefined && usage.costUsd === undefined ? undefined : (currentCost || 0) + (usage.costUsd || 0);
    const nextUsage = normalizeUsage({
      promptTokens: chat.usage.promptTokens + (usage.promptTokens || 0),
      completionTokens: chat.usage.completionTokens + (usage.completionTokens || 0),
      totalTokens: chat.usage.totalTokens + (usage.totalTokens || 0),
      costUsd: nextCost
    });
    await this.update(chatId, { usage: nextUsage });
    return nextUsage;
  }

  async rebuildIndex(): Promise<ChatSummary[]> {
    const chatIds = await this.listChatIds();
    const chats: Chat[] = [];
    for (const chatId of chatIds) {
      const chat = await this.get(chatId);
      if (chat) {
        chats.push(chat);
      }
    }

    const summaries = sortSummaries(chats.map(toSummary));
    await safeMkdir(this.rootPath);
    await writeJsonAtomic(this.indexPath(), {
      schemaVersion: CHAT_SCHEMA_VERSION,
      updatedAt: this.now(),
      chats: summaries
    } satisfies StoredChatIndex);
    return summaries;
  }

  private async requireChat(chatId: string): Promise<Chat> {
    const chat = await this.get(chatId);
    if (!chat) {
      throw new FileRepositoryError('repository.readFailed', `Chat not found: ${chatId}`, { id: chatId });
    }

    return chat;
  }

  private async requireMeta(chatId: string): Promise<StoredChatMeta> {
    const safeChatId = assertRepositoryId(chatId, 'chat');
    const meta = await readJsonFile<StoredChatMeta>(this.metaPath(safeChatId));
    if (!meta) {
      throw new FileRepositoryError('repository.readFailed', `Chat not found: ${safeChatId}`, { id: safeChatId });
    }

    return normalizeMeta(meta);
  }

  private async readChatFromMeta(meta: StoredChatMeta): Promise<Chat> {
    const normalizedMeta = normalizeMeta(meta);
    const messages = await readJsonlFile<ChatMessage>(this.messagesPath(normalizedMeta.id));
    const history = await readJsonlFile<OpenRouterMessage>(this.historyPath(normalizedMeta.id));
    const state = await this.readState(normalizedMeta.id);

    return {
      id: normalizedMeta.id,
      title: normalizedMeta.title,
      model: normalizedMeta.model,
      previousChatId: normalizedMeta.previousChatId,
      compactedAt: normalizedMeta.compactedAt,
      messages,
      history,
      lastAnswer: normalizedMeta.lastAnswer,
      busy: state.busy,
      activity: state.activity,
      activityDetail: state.activityDetail,
      modelRequest: state.modelRequest,
      context: state.context,
      contextLength: state.contextLength,
      activePlan: state.activePlan,
      reflectionCandidates: state.reflectionCandidates,
      usage: normalizedMeta.usage,
      createdAt: normalizedMeta.createdAt,
      updatedAt: normalizedMeta.updatedAt
    };
  }

  private async readState(chatId: string): Promise<StoredChatState> {
    const rawState = await readJsonFile<Partial<StoredChatState>>(this.statePath(chatId));
    return normalizeState(rawState);
  }

  private async readUsableIndex(): Promise<StoredChatIndex | undefined> {
    let index: StoredChatIndex | undefined;
    try {
      index = await readJsonFile<StoredChatIndex>(this.indexPath());
    } catch (error) {
      if (error instanceof FileRepositoryError && error.code === 'repository.invalidJson') {
        return undefined;
      }

      throw error;
    }

    if (!index || index.schemaVersion !== CHAT_SCHEMA_VERSION || !Array.isArray(index.chats)) {
      return undefined;
    }

    const indexIds = new Set(index.chats.map((chat) => chat.id));
    const sourceIds = await this.listChatIds();
    if (indexIds.size !== sourceIds.length || sourceIds.some((chatId) => !indexIds.has(chatId))) {
      return undefined;
    }

    return index;
  }

  private async listChatIds(): Promise<string[]> {
    const directoryNames = await listDirectoryNames(this.rootPath);
    const chatIds: string[] = [];
    for (const directoryName of directoryNames) {
      const chatId = assertRepositoryId(directoryName, 'chat');
      if (await pathExists(this.metaPath(chatId))) {
        chatIds.push(chatId);
      }
    }

    return chatIds.sort();
  }

  private createMessage(message: ChatMessageInput, now: number): ChatMessage {
    return {
      ...message,
      id: message.id || this.idFactory(),
      createdAt: message.createdAt || now
    };
  }

  private async touch(meta: StoredChatMeta): Promise<void> {
    await this.writeMeta({ ...meta, updatedAt: this.now() });
  }

  private writeMeta(meta: StoredChatMeta): Promise<void> {
    return writeJsonAtomic(this.metaPath(meta.id), normalizeMeta(meta));
  }

  private writeState(chatId: string, state: StoredChatState): Promise<void> {
    return writeJsonAtomic(this.statePath(chatId), state);
  }

  private async replaceJsonl(
    chatId: string,
    fileName: 'messages.jsonl' | 'history.jsonl',
    entries: unknown[]
  ): Promise<void> {
    const targetPath = path.join(this.chatPath(chatId), fileName);
    const tempPath = path.join(
      path.dirname(targetPath),
      `.${fileName}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
    );
    const content = entries.length ? `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n` : '';

    try {
      await fs.promises.writeFile(tempPath, content, 'utf8');
      await fs.promises.rename(tempPath, targetPath);
    } catch (error) {
      await fs.promises.rm(tempPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  private chatPath(chatId: string): string {
    return childPath(this.rootPath, assertRepositoryId(chatId, 'chat'));
  }

  private metaPath(chatId: string): string {
    return path.join(this.chatPath(chatId), 'meta.json');
  }

  private messagesPath(chatId: string): string {
    return path.join(this.chatPath(chatId), 'messages.jsonl');
  }

  private historyPath(chatId: string): string {
    return path.join(this.chatPath(chatId), 'history.jsonl');
  }

  private statePath(chatId: string): string {
    return path.join(this.chatPath(chatId), 'state.json');
  }

  private indexPath(): string {
    return path.join(this.rootPath, 'index.json');
  }
}

function normalizeMeta(meta: StoredChatMeta): StoredChatMeta {
  return removeUndefined({
    schemaVersion: CHAT_SCHEMA_VERSION,
    id: assertRepositoryId(meta.id, 'chat'),
    title: typeof meta.title === 'string' && meta.title.trim() ? meta.title : DEFAULT_TITLE,
    model: typeof meta.model === 'string' && meta.model.trim() ? meta.model : 'unknown',
    previousChatId: meta.previousChatId,
    compactedAt: meta.compactedAt,
    lastAnswer: typeof meta.lastAnswer === 'string' ? meta.lastAnswer : '',
    usage: normalizeUsage(meta.usage),
    createdAt: normalizeTimestamp(meta.createdAt),
    updatedAt: normalizeTimestamp(meta.updatedAt || meta.createdAt)
  });
}

function normalizeState(state: Partial<StoredChatState> | ChatStatePatch | undefined): StoredChatState {
  return removeUndefined({
    schemaVersion: CHAT_SCHEMA_VERSION,
    busy: Boolean(state?.busy),
    activity: state?.activity,
    activityDetail: state?.activityDetail,
    modelRequest: state?.modelRequest,
    context: state?.context,
    contextLength: state?.contextLength,
    activePlan: state?.activePlan,
    reflectionCandidates: state?.reflectionCandidates
  });
}

function normalizeUsage(usage: Partial<ChatUsageEstimate> | undefined): ChatUsageEstimate {
  return removeUndefined({
    promptTokens: usage?.promptTokens || 0,
    completionTokens: usage?.completionTokens || 0,
    totalTokens: usage?.totalTokens || 0,
    costUsd: usage?.costUsd
  });
}

function normalizeTimestamp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now();
}

function toSummary(chat: Chat): ChatSummary {
  return {
    id: chat.id,
    title: getChatTitle(chat),
    model: chat.model,
    previousChatId: chat.previousChatId,
    compactedAt: chat.compactedAt,
    messageCount: chat.messages.filter((message) => message.role === 'user' || message.role === 'assistant').length,
    lastUserMessage: getLastUserMessage(chat),
    busy: chat.busy,
    lastMessageAt: getLastMessageAt(chat),
    updatedAt: chat.updatedAt
  };
}

function getLastMessageAt(chat: Chat): number {
  return chat.messages.at(-1)?.createdAt || chat.createdAt;
}

function getChatTitle(chat: Chat): string {
  const firstUserMessage = chat.messages.find((message) => message.role === 'user' && message.content?.trim());
  return firstUserMessage ? toSingleLinePreview(firstUserMessage.content || '', 50) || chat.title : chat.title;
}

function getLastUserMessage(chat: Chat): string {
  const lastUserMessage = [...chat.messages]
    .reverse()
    .find((message) => message.role === 'user' && message.content?.trim());
  return lastUserMessage ? toSingleLinePreview(lastUserMessage.content || '', 50) : '';
}

function toSingleLinePreview(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function sortSummaries(summaries: ChatSummary[]): ChatSummary[] {
  return sortByUpdatedAtDesc(summaries.map((summary) => ({ ...summary, createdAt: summary.lastMessageAt })));
}
