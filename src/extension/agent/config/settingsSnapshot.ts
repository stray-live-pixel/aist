import * as vscode from 'vscode';

import { DEFAULT_MODEL } from '../../shared/constants';
import { normalizeCodexServiceTier, normalizeEditorContextMode, normalizeReasoningEffort } from './config';

/**
 * Возвращает модель по умолчанию из настроек VS Code.
 *
 * Используется при создании или пересоздании чата, когда у конкретного чата еще
 * нет собственного выбора модели.
 */
export function getConfiguredModel(): string {
  return vscode.workspace.getConfiguration('openrouterAgent').get<string>('model') || DEFAULT_MODEL;
}

/**
 * Снимает настройки, которые нужны для state webview.
 *
 * Snapshot делает sendState короче и гарантирует одинаковую нормализацию чисел,
 * reasoningEffort, Codex service tier и режима streaming для всех webview-поверхностей.
 */
export function getAgentSettingsSnapshot(): {
  configuredModel: string;
  maxToolIterations: number;
  reasoningEffort: ReturnType<typeof normalizeReasoningEffort>;
  codexServiceTier: ReturnType<typeof normalizeCodexServiceTier>;
  editorContextMode: ReturnType<typeof normalizeEditorContextMode>;
  streamingEnabled: boolean;
} {
  const config = vscode.workspace.getConfiguration('openrouterAgent');

  return {
    configuredModel: config.get<string>('model') || DEFAULT_MODEL,
    maxToolIterations: Math.max(0, Math.floor(config.get<number>('maxToolIterations') || 0)),
    reasoningEffort: normalizeReasoningEffort(config.get<string>('reasoningEffort')),
    codexServiceTier: normalizeCodexServiceTier(config.get<string>('codexServiceTier')),
    editorContextMode: normalizeEditorContextMode(config.get<string>('editorContextMode')),
    // По умолчанию используем non-streaming: он менее интерактивный, но устойчивее к оборванным SSE-соединениям.
    streamingEnabled: config.get<boolean>('streamingEnabled') === true
  };
}
