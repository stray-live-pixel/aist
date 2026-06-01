/**
 * Что это: ключ workspaceState для активного daemon-чата.
 * Зачем нужно: после перезапуска VS Code extension восстанавливает последний выбранный чат.
 * Какую продуктовую проблему решает: пользователь возвращается к тому же диалогу без ручного поиска в истории.
 */
export const DAEMON_RUNTIME_ACTIVE_CHAT_ID_KEY = 'daemonRuntime.activeChatId';
