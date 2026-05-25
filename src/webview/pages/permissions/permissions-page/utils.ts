import type { useI18n } from '../../../shared/i18n';
import type { AgentItemRef, AgentItemScope, ToolPermissionMode } from '../../../shared/types';

/**
 * Что это: локализованное имя scope инструкции/режима.
 * Зачем нужно: scope хранится как enum-like значение, а UI должен показывать понятную пользователю подпись.
 */
export function scopeLabel(scope: AgentItemScope, t: ReturnType<typeof useI18n>['t']): string {
  return scope === 'global' ? t('settings.promptManager.scope.global') : t('settings.promptManager.scope.local');
}

/**
 * Что это: стабильный ключ ссылки на prompt item.
 * Зачем нужно: preset хранит scope+id, а UI часто сравнивает ссылки и использует их как React key.
 */
export function refKey(ref: AgentItemRef | { scope: AgentItemScope; id: string }): string {
  return `${ref.scope}:${ref.id}`;
}

/**
 * Что это: обратное преобразование ключа select в ссылку prompt item.
 * Зачем нужно: shared Select работает со строками, а IPC-контракт ожидает объект `{ scope, id }`.
 */
export function parseRefKey(value: string): AgentItemRef | undefined {
  const [scope, ...rest] = value.split(':');
  const id = rest.join(':');
  return (scope === 'global' || scope === 'local') && id ? { scope, id } : undefined;
}

/**
 * Что это: options для выбора режима разрешения tool.
 * Зачем нужно: один helper переиспользуется формой создания и редактирования custom skills.
 */
export function getPermissionOptions(t: ReturnType<typeof useI18n>['t']) {
  return [
    { value: 'ask', label: t('settings.permission.ask') },
    { value: 'auto', label: t('settings.permission.auto') }
  ];
}

/**
 * Что это: ограничение числа безопасным диапазоном с fallback.
 * Зачем нужно: input[type=number] всё равно отдаёт строку, поэтому перед IPC нормализуем значения в одном месте.
 */
export function clampNumber(value: string, min: number, max: number, fallback: number, integer = false): number {
  const parsed = Number(value);
  const normalized = Number.isFinite(parsed) ? parsed : fallback;
  const clamped = Math.max(min, Math.min(max, normalized));
  return integer ? Math.floor(clamped) : clamped;
}
