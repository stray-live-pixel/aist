import { BellRing, ChevronDown, ShieldAlert } from 'lucide-react';
import { useEffect } from 'react';

import { ToolApprovalActions } from '../../entities/message/ToolApprovalActions';
import { ToolResultPreview } from '../../entities/message/ToolResultPreview';
import { useI18n } from '../../shared/i18n';
import type { AgentState, ChatMessage } from '../../shared/types';
import { IconButton } from '../../shared/ui/IconButton';

export type ApprovalPromptModalProps = {
  message: ChatMessage;
  settings: AgentState['approvalNotificationSettings'];
  minimized: boolean;
  onMinimize(): void;
  onRestore(): void;
  onResolved?(): void;
};

/**
 * Главный UI подтверждения действия.
 * Модалка намеренно перекрывает чат и composer: без решения пользователя агент стоит на паузе,
 * поэтому продуктово это более важное действие, чем ввод нового сообщения.
 */
export function ApprovalPromptModal({
  message,
  settings,
  minimized,
  onMinimize,
  onRestore,
  onResolved
}: ApprovalPromptModalProps) {
  const { t } = useI18n();
  useApprovalNotifications(message, settings);

  if (minimized) {
    return <ApprovalNotice message={message} onClick={onRestore} />;
  }

  return (
    <div className="tool-modal-backdrop approval-modal-backdrop" role="presentation">
      <section className="tool-modal approval-modal" role="dialog" aria-modal="true" aria-label={t('approval.title')}>
        <header className="tool-modal-header approval-modal-header">
          <div className="flex min-w-0 items-start gap-3">
            <span className="approval-modal-icon">
              <ShieldAlert size={18} />
            </span>
            <div className="min-w-0">
              <h2>{t('approval.title')}</h2>
              <p>{message.name ? t('approval.descriptionTool', { tool: message.name }) : t('approval.description')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconButton title={t('approval.minimize')} onClick={onMinimize}>
              <ChevronDown size={15} />
            </IconButton>
          </div>
        </header>
        <div className="approval-modal-body">
          <ToolResultPreview message={message} />
          <ToolApprovalActions
            messageId={message.id}
            autoFocusApprove
            onResolved={() => {
              onResolved?.();
              onMinimize();
            }}
          />
        </div>
      </section>
    </div>
  );
}

/**
 * Индикатор появляется над composer, если пользователь свернул модалку.
 * Он оставляет доступ к истории чата, но явно показывает, что дальнейшая работа агента ждёт решения.
 */
export function ApprovalNotice({ message, onClick }: { message: ChatMessage; onClick(): void }) {
  const { t } = useI18n();
  return (
    <button className="approval-notice" type="button" onClick={onClick}>
      <BellRing size={16} />
      <span className="approval-notice-main">{t('approval.noticeTitle')}</span>
      <span className="approval-notice-detail">{message.name || t('message.tool')}</span>
    </button>
  );
}

/**
 * Побочные эффекты уведомлений живут рядом с approval-модалкой.
 * Так звук и системный баннер запускаются ровно при появлении нового pending tool-call,
 * а не при каждом обновлении текста чата или activity-status.
 */
function useApprovalNotifications(message: ChatMessage, settings: AgentState['approvalNotificationSettings']) {
  const notificationKey = `${message.id}:${message.approval}`;
  const canNotify = settings.enabled && message.approval === 'pending';

  useEffect(() => {
    if (!canNotify) {
      return;
    }

    if (settings.systemNotifications) {
      showSystemNotification(message);
    }
  }, [canNotify, message, notificationKey, settings.systemNotifications]);

  useEffect(() => {
    if (!canNotify || !settings.sound) {
      return;
    }

    return playGentleBell(settings.volume, settings.durationSeconds);
  }, [canNotify, notificationKey, settings.durationSeconds, settings.sound, settings.volume]);
}

function showSystemNotification(message: ChatMessage) {
  const title = 'AIST ждёт подтверждение';
  const body = message.name ? `Инструмент ${message.name} готов к запуску.` : 'Инструмент готов к запуску.';

  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, { body });
    return;
  }

  if (Notification.permission !== 'denied') {
    void Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    });
  }
}

function playGentleBell(volume: number, durationSeconds: number) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return undefined;
  }

  const context = new AudioContextCtor();
  const master = context.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume));
  master.connect(context.destination);

  const stopAt = context.currentTime + Math.max(1, durationSeconds);
  const interval = window.setInterval(() => ringBell(context, master), 1100);
  ringBell(context, master);

  const timeout = window.setTimeout(
    () => {
      window.clearInterval(interval);
      master.gain.setTargetAtTime(0, context.currentTime, 0.08);
      void context.close();
    },
    Math.max(1, durationSeconds) * 1000
  );

  return () => {
    window.clearInterval(interval);
    window.clearTimeout(timeout);
    void context.close();
  };
}

function ringBell(context: AudioContext, destination: GainNode) {
  const now = context.currentTime;
  [880, 1320].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now + index * 0.035);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.045 + index * 0.035);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.72 + index * 0.04);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(now + index * 0.035);
    oscillator.stop(now + 0.8 + index * 0.04);
  });
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
