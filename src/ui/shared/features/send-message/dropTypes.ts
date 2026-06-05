/**
 * Что это: минимальный контракт drag-and-drop данных, который нужен Composer.
 * Зачем нужно: утилиты остаются чистыми и тестируемыми без React-событий и реального браузерного DataTransfer.
 */
export type ComposerDropDataTransfer = {
  /** Список MIME-типов, которые VS Code или браузер положил в drag payload. */
  types?: ArrayLike<string>;
  /** Читает текстовое значение по MIME-типу, например text/uri-list или text/plain. */
  getData(type: string): string;
  /** Browser/Electron может отдать локальные файлы с непубличным, но полезным полем path. */
  files?: ArrayLike<{ name?: string; path?: string }>;
};

/**
 * Что это: результат вставки текста в prompt.
 * Зачем нужно: компоненту нужно синхронно обновить value и затем вернуть курсор сразу после вставленных путей.
 */
export type PromptTextInsertion = {
  value: string;
  cursorPosition: number;
};
