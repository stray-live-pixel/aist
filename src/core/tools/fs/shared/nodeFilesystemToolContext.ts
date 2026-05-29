/**
 * Контекст Node-инструментов файловой системы.
 *
 * В нём хранится корень workspace и дополнительные сведения редактора, чтобы
 * каждый fs-инструмент работал только внутри проекта пользователя и мог вернуть
 * понятный результат без доступа к глобальному состоянию VS Code.
 */
export type NodeFilesystemToolContext = {
  workspaceRoot: string;
  workspaceName?: string;
  activeFile?: string | null;
  activeLanguage?: string | null;
};
