import { BellRing, ChevronDown, ShieldAlert } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';

import { ToolApprovalActions, ToolResultPreview } from '../../entities/message';
import { useI18n } from '../../shared/i18n';
import type { AgentState, ChatMessage } from '../../shared/types';
import { ModalBackdrop, ModalHeader, ModalSurface } from '../../shared/ui';
import { IconButton } from '../../shared/ui/IconButton';
import styles from './ChatPage.module.scss';

/**
 * Длительность синхронизирована с CSS-анимациями ниже: React держит модалку в DOM,
 * пока backdrop и surface плавно исчезают, но не создаёт ощутимой задержки после клика.
 */
const APPROVAL_MODAL_ANIMATION_MS = 180;

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
  const [closing, setClosing] = useState(false);
  const closeTimeoutRef = useRef<number | undefined>(undefined);
  useApprovalNotifications(message, settings);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== undefined) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  function closeWithAnimation() {
    if (closing) {
      return;
    }

    setClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      onMinimize();
    }, APPROVAL_MODAL_ANIMATION_MS);
  }

  if (minimized) {
    return <ApprovalNotice message={message} onClick={onRestore} />;
  }

  return (
    <ModalBackdrop
      className={closing ? styles.approvalModalBackdropClosing : styles.approvalModalBackdrop}
      tone="approval"
      role="presentation"
    >
      <ModalSurface
        className={closing ? styles.approvalModalSurfaceClosing : styles.approvalModalSurface}
        tone="approval"
        role="dialog"
        aria-modal="true"
        aria-label={t('approval.title')}
      >
        <ModalHeader tone="approval">
          <div className={styles.modalHeaderMain}>
            <span className={styles.approvalIcon}>
              <ShieldAlert size={18} />
            </span>
            <div className={styles.modalHeaderText}>
              <h2>{t('approval.title')}</h2>
              <p>{message.name ? t('approval.descriptionTool', { tool: message.name }) : t('approval.description')}</p>
            </div>
          </div>
          <div className={styles.modalHeaderActions}>
            <IconButton title={t('approval.minimize')} onClick={closeWithAnimation}>
              <ChevronDown size={15} />
            </IconButton>
          </div>
        </ModalHeader>
        <div className={styles.approvalBody}>
          <ToolResultPreview message={message} />
          <ToolApprovalActions
            messageId={message.id}
            autoFocusApprove
            onResolved={() => {
              onResolved?.();
              closeWithAnimation();
            }}
          />
        </div>
      </ModalSurface>
    </ModalBackdrop>
  );
}

/**
 * Индикатор появляется над composer, если пользователь свернул модалку.
 * Он оставляет доступ к истории чата, но явно показывает, что дальнейшая работа агента ждёт решения.
 */
export const ApprovalNotice = memo(function ApprovalNotice({
  message,
  onClick
}: {
  message: ChatMessage;
  onClick(): void;
}) {
  const { t } = useI18n();
  return (
    <button className={styles.approvalNotice} type="button" onClick={onClick}>
      <BellRing size={16} />
      <span className={styles.approvalNoticeMain}>{t('approval.noticeTitle')}</span>
      <span className={styles.approvalNoticeDetail}>{message.name || t('message.tool')}</span>
    </button>
  );
});

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
    // notificationKey намеренно стабилен по message.id и approval-status: backend patches могут менять объект message,
    // но продуктово это всё тот же approval prompt и повторять системный баннер нельзя.
  }, [canNotify, notificationKey, settings.systemNotifications]);

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
