/**
 * Что это: визуальный тон карточки инструмента.
 * Зачем нужно: каждый тип инструмента получает свой пастельный цвет, не перегружая чат.
 */
export type ToolTone = 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'cyan' | 'slate';

/**
 * Что это: ссылка на файл в workspace с опциональной позицией.
 * Зачем нужно: tool-call может указывать файл, строку и диапазон для навигации из VS Code.
 */
export type FileReference = {
  path: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  label?: string;
};

/**
 * Что это: нормализованная модель для отображения tool-call в UI.
 * Зачем нужно: React-компоненты остаются простыми и не знают форму JSON каждого инструмента.
 */
export type ToolDisplayModel = {
  /** Локализованное название действия (например, «READ FILE»). */
  action: string;
  /** Заголовок с целью (например, «READ FILE: src/index.ts»). */
  title: string;
  /** Визуальный тон для цветовой дифференциации. */
  tone: ToolTone;
  /** Основной файл для отображения и навигации. */
  primaryFile?: FileReference;
  /** Все файлы, упомянутые в результате. */
  files: FileReference[];
  /** Краткая сводка результата (например, «exit 0 · 1.5s»). */
  summary: string;
};
