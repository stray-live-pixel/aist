import type { DaemonEvent } from '../daemonProtocol';

/**
 * Что это: контейнер для runtime-проверки события daemon.
 * Зачем нужно: TypeScript умеет сужать весь объект-параметр, а не destructuring binding.
 * Какую продуктовую проблему решает: повреждённое сообщение не ломает подписку пользователя на фоновые события.
 */
export type DaemonEventCandidate = {
  value: unknown;
};

/**
 * Что это: runtime-проверка события daemon.
 * Зачем нужно: JSON-RPC уведомления приходят как unknown и требуют безопасной валидации.
 * Какую продуктовую проблему решает: повреждённое сообщение не ломает подписку пользователя на фоновые события.
 */
export function isDaemonEvent(candidate: DaemonEventCandidate): candidate is { value: DaemonEvent } {
  const { value } = candidate;
  return Boolean(value) && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string';
}
