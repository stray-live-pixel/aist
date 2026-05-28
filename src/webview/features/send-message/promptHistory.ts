/**
 * Что это: browser-side хранилище draft и истории prompt-ов composer.
 * Зачем нужно: сохраняет незавершённый ввод при переключении чатов/страниц и даёт terminal-like историю отправленных prompt-ов.
 */
export type PromptHistoryItem = {
  id: string;
  prompt: string;
  chatId?: string;
  createdAt: number;
};

const DRAFT_KEY_PREFIX = 'aist.composer.draft.';
const GLOBAL_HISTORY_KEY = 'aist.composer.history.global';
const CHAT_HISTORY_KEY_PREFIX = 'aist.composer.history.chat.';
const MAX_HISTORY_ITEMS = 200;

export function loadPromptDraft(chatId: string): string {
  return readString(`${DRAFT_KEY_PREFIX}${chatId}`);
}

export function savePromptDraft(chatId: string, prompt: string): void {
  const key = `${DRAFT_KEY_PREFIX}${chatId}`;

  if (!prompt) {
    removeStorageItem(key);
    return;
  }

  writeString(key, prompt);
}

export function loadChatPromptHistory(chatId: string): PromptHistoryItem[] {
  return readHistory(`${CHAT_HISTORY_KEY_PREFIX}${chatId}`);
}

export function loadGlobalPromptHistory(): PromptHistoryItem[] {
  return readHistory(GLOBAL_HISTORY_KEY);
}

export function loadPromptHistory(chatId: string): PromptHistoryItem[] {
  return mergePromptHistory(loadChatPromptHistory(chatId), loadGlobalPromptHistory());
}

export function addPromptToHistory(chatId: string, prompt: string): PromptHistoryItem {
  const value = prompt.trim();
  const item: PromptHistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: value,
    chatId,
    createdAt: Date.now()
  };

  writeHistory(`${CHAT_HISTORY_KEY_PREFIX}${chatId}`, prependHistoryItem(loadChatPromptHistory(chatId), item));
  writeHistory(GLOBAL_HISTORY_KEY, prependHistoryItem(loadGlobalPromptHistory(), item));

  return item;
}

function prependHistoryItem(history: PromptHistoryItem[], item: PromptHistoryItem): PromptHistoryItem[] {
  return [item, ...history.filter((entry) => entry.prompt !== item.prompt)].slice(0, MAX_HISTORY_ITEMS);
}

function mergePromptHistory(chatHistory: PromptHistoryItem[], globalHistory: PromptHistoryItem[]): PromptHistoryItem[] {
  const seen = new Set<string>();

  return [...chatHistory, ...globalHistory]
    .sort((a, b) => b.createdAt - a.createdAt)
    .filter((item) => {
      if (seen.has(item.prompt)) {
        return false;
      }

      seen.add(item.prompt);
      return true;
    });
}

function readHistory(key: string): PromptHistoryItem[] {
  const raw = readString(key);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as PromptHistoryItem[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item.prompt === 'string' && item.prompt.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function writeHistory(key: string, history: PromptHistoryItem[]): void {
  writeString(key, JSON.stringify(history));
}

function readString(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeString(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // LocalStorage может быть недоступен в storybook/private режимах; composer всё равно должен работать in-memory.
  }
}

function removeStorageItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // См. writeString: недоступное хранилище не должно ломать отправку prompt-а.
  }
}
