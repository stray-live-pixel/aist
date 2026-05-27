import type { CodexServiceTier, EditorContextMode, ReasoningEffort } from '../types';

/**
 * Приводит значение reasoning effort из VS Code settings/webview к безопасному enum.
 *
 * Настройки могут быть изменены вручную в settings.json, поэтому контроллер не
 * доверяет raw-значению и отправляет провайдеру только поддерживаемые варианты.
 */
export function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'auto';
}

/**
 * Приводит настройку ChatGPT Codex service_tier к безопасному значению.
 *
 * `auto` означает «не добавлять поле в payload»: так сохраняем прежнее поведение
 * и не отправляем экспериментальный параметр моделям/аккаунтам, где он недоступен.
 */
export function normalizeCodexServiceTier(value: unknown): CodexServiceTier {
  return value === 'priority' ? 'priority' : 'auto';
}

export function normalizeEditorContextMode(value: unknown): EditorContextMode {
  return value === 'selection' || value === 'file' || value === 'off' ? value : 'auto';
}
