/**
 * Что это: настройки создания файлового репозитория чатов.
 * Зачем нужно: тесты и CLI могут подменять workspace, home, часы и генератор id.
 * Какую продуктовую проблему решает: чаты сохраняются в правильном рабочем пространстве и остаются тестируемыми.
 */
export type ChatRepositoryOptions = {
  workspaceRoot: string;
  homeDir?: string;
  idFactory?: () => string;
  now?: () => number;
};
