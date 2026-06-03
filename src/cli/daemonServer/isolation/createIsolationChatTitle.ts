/**
 * Что это: короткий заголовок стандартного чата isolated-сессии.
 * Зачем нужно: один и тот же title используется в списке чатов и карточке Docker-сессии.
 * Какую продуктовую проблему решает: пользователь быстро узнаёт вкладку isolated агента среди обычных диалогов.
 */
export function createIsolationChatTitle({ prompt }: { prompt: string }): string {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  const taskTitle = normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized || 'Detached task';
  return `Docker agent: ${taskTitle}`;
}
