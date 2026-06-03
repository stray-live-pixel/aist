import type { DaemonEvent } from '../../../../cli/daemonProtocol';
import { getDaemonEventChatId } from '../../webview/getDaemonEventChatId';

/**
 * Что это: цель refresh после daemon-события.
 * Зачем нужно: bridge явно различает точечное обновление чата и полный refresh всего state.
 * Какую продуктовую проблему решает: активные агенты в разных чатах не провоцируют лишнее перечитывание всех диалогов.
 */
export type BridgeRefreshTarget = { kind: 'chat'; chatId: string } | { kind: 'state' };

/**
 * Что это: выбирает минимально достаточный refresh для daemon-события.
 * Зачем нужно: все события с chatId должны обновлять только затронутый чат, а не весь список.
 * Какую продуктовую проблему решает: параллельные агенты остаются отзывчивыми, потому что обычный progress не запускает full refresh.
 */
export function getBridgeRefreshTarget({ event }: { event: DaemonEvent }): BridgeRefreshTarget {
  const chatId = getDaemonEventChatId(event);

  if (chatId) {
    return { kind: 'chat', chatId };
  }

  return { kind: 'state' };
}
