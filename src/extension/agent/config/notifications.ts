import * as vscode from 'vscode';

/**
 * Настройки уведомлений именно для approval-сценария.
 * Продуктово это отдельный канал внимания: агент не может продолжить без решения пользователя,
 * поэтому системный баннер и мягкий звук настраиваются вместе, но могут отключаться независимо.
 */
export type ApprovalNotificationSettings = {
  enabled: boolean;
  systemNotifications: boolean;
  sound: boolean;
  volume: number;
  durationSeconds: number;
};

/**
 * Дефолт делает подтверждение заметным без агрессивного поведения:
 * системное уведомление включено, звук тихий и длится 5 секунд.
 */
const DEFAULT_APPROVAL_NOTIFICATION_SETTINGS: ApprovalNotificationSettings = {
  enabled: true,
  systemNotifications: true,
  sound: true,
  volume: 0.35,
  durationSeconds: 5
};

/**
 * Читает настройки из VS Code configuration и всегда возвращает безопасную полную форму.
 * Это важно для обратной совместимости: у существующих пользователей ключа ещё нет.
 */
export function getApprovalNotificationSettings(): ApprovalNotificationSettings {
  const raw =
    vscode.workspace
      .getConfiguration('openrouterAgent')
      .get<Partial<ApprovalNotificationSettings>>('approvalNotifications') || {};

  return normalizeApprovalNotificationSettings(raw);
}

/**
 * Сохраняет только нормализованное значение, чтобы UI и runtime работали с одним форматом.
 * Workspace scope выбран так же, как для остальных быстрых настроек агента в этом проекте.
 */
export async function setApprovalNotificationSettings(settings: Partial<ApprovalNotificationSettings>): Promise<void> {
  const next = normalizeApprovalNotificationSettings({ ...getApprovalNotificationSettings(), ...settings });
  await vscode.workspace
    .getConfiguration('openrouterAgent')
    .update('approvalNotifications', next, vscode.ConfigurationTarget.Workspace);
}

/**
 * Централизованно ограничивает значения из settings.json и webview.
 * Так случайная ручная правка конфигурации не даст слишком громкий или бесконечный сигнал.
 */
export function normalizeApprovalNotificationSettings(
  settings: Partial<ApprovalNotificationSettings>
): ApprovalNotificationSettings {
  return {
    enabled: settings.enabled ?? DEFAULT_APPROVAL_NOTIFICATION_SETTINGS.enabled,
    systemNotifications: settings.systemNotifications ?? DEFAULT_APPROVAL_NOTIFICATION_SETTINGS.systemNotifications,
    sound: settings.sound ?? DEFAULT_APPROVAL_NOTIFICATION_SETTINGS.sound,
    volume: clampNumber(settings.volume, 0, 1, DEFAULT_APPROVAL_NOTIFICATION_SETTINGS.volume),
    durationSeconds: clampNumber(
      settings.durationSeconds,
      1,
      30,
      DEFAULT_APPROVAL_NOTIFICATION_SETTINGS.durationSeconds
    )
  };
}

/** Ограничивает числовые настройки диапазоном, сохраняя понятный fallback для битых значений. */
function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numberValue));
}
