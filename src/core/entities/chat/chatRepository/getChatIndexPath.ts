import path from 'node:path';

import type { ChatRepositoryContext } from './ChatRepositoryContext';

/**
 * Что это: путь к index.json списка чатов.
 * Зачем нужно: все операции rebuild/list работают с единым индексом workspace.
 * Какую продуктовую проблему решает: история чатов открывается быстро и консистентно.
 */
export function getChatIndexPath({ context }: { context: ChatRepositoryContext }): string {
  return path.join(context.rootPath, 'index.json');
}
