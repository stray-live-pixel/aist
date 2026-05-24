import type { ReasoningEffort } from '../types';

/**
 * Приводит значение reasoning effort из VS Code settings/webview к безопасному enum.
 *
 * Настройки могут быть изменены вручную в settings.json, поэтому контроллер не
 * доверяет raw-значению и отправляет провайдеру только поддерживаемые варианты.
 */
export function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'auto';
}
