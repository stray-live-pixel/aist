import * as vscode from 'vscode';

export type ComposerUiSettings = {
  gradientWhileBusy: boolean;
  minimizeOnBlur: boolean;
};

const DEFAULT_COMPOSER_UI_SETTINGS: ComposerUiSettings = {
  gradientWhileBusy: true,
  minimizeOnBlur: true
};

/**
 * Читает настройки поведения Composer из VS Code configuration и нормализует отсутствующие ключи.
 */
export function getComposerUiSettings(): ComposerUiSettings {
  const configuration = vscode.workspace.getConfiguration('openrouterAgent');

  return normalizeComposerUiSettings({
    gradientWhileBusy: configuration.get<boolean>('composerGradientWhileBusy'),
    minimizeOnBlur: configuration.get<boolean>('minimizeComposerOnBlur')
  });
}

/**
 * Сохраняет только переданные настройки, чтобы независимые ключи VS Code не перезатирали друг друга.
 */
export async function setComposerUiSettings(settings: Partial<ComposerUiSettings>): Promise<void> {
  const configuration = vscode.workspace.getConfiguration('openrouterAgent');
  const next = normalizeComposerUiSettings({ ...getComposerUiSettings(), ...settings });

  if (settings.gradientWhileBusy !== undefined) {
    await configuration.update(
      'composerGradientWhileBusy',
      next.gradientWhileBusy,
      vscode.ConfigurationTarget.Workspace
    );
  }

  if (settings.minimizeOnBlur !== undefined) {
    await configuration.update('minimizeComposerOnBlur', next.minimizeOnBlur, vscode.ConfigurationTarget.Workspace);
  }
}

export function normalizeComposerUiSettings(settings: Partial<ComposerUiSettings>): ComposerUiSettings {
  return {
    gradientWhileBusy: settings.gradientWhileBusy ?? DEFAULT_COMPOSER_UI_SETTINGS.gradientWhileBusy,
    minimizeOnBlur: settings.minimizeOnBlur ?? DEFAULT_COMPOSER_UI_SETTINGS.minimizeOnBlur
  };
}
