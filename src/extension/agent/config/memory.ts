import * as vscode from 'vscode';

/**
 * Что это: настройки поведения долгосрочной памяти агента.
 * Зачем нужно: пользователь выбирает, может ли AIST сам записывать заметки после задачи.
 * Какую продуктовую проблему решает: автопамять можно отключить и оставить только ручную кнопку анализа.
 */
export type MemorySettings = {
  autoApply: boolean;
};

/** Возвращает настройки памяти из VS Code configuration. */
export function getMemorySettings(): MemorySettings {
  const config = vscode.workspace.getConfiguration('openrouterAgent');
  return {
    autoApply: config.get<boolean>('memory.autoApply') !== false
  };
}

/** Сохраняет настройки памяти в workspace. */
export function setMemorySettings(settings: Partial<MemorySettings>): Thenable<void> {
  const current = getMemorySettings();
  return vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('memory', { ...current, ...settings }, vscode.ConfigurationTarget.Workspace);
}
