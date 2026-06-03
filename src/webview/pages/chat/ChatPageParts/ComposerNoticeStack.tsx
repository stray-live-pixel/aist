import { Server } from 'lucide-react';

import { isIsolationSessionActive } from '../../../shared/lib/isolation';
import type { AgentState, ChatMessage, IsolationSessionSummary } from '../../../shared/types';
import { Badge, Text } from '../../../shared/ui';
import type { BadgeTone } from '../../../shared/ui';
import type { SettingsPageId } from '../../permissions/permissions-page/types';
import { ModelSettingsPanel } from '../AgentSettingsSummary';
import { ApprovalPromptModal } from '../ApprovalPromptModal';
import styles from '../ChatPage.module.scss';
import { VcsControls } from './VcsControls';

/**
 * Что это: компактный стек временных панелей над Composer.
 * Зачем нужно: ChatPage остаётся главным сценарным экраном, а детали model/VCS/approval notice живут рядом отдельным компонентом.
 * Какую продуктовую проблему решает: пользователь видит настройки и свернутый approval prompt без разрастания основного экрана чата.
 */
export function ComposerNoticeStack({
  state,
  composerMinimized,
  modelPanelOpen,
  vcsPanelOpen,
  pendingApproval,
  approvalMinimized,
  isolationSession,
  onApprovalMinimize,
  onApprovalRestore,
  onApprovalResolved,
  onOpenSettingsPage
}: {
  state: AgentState;
  composerMinimized: boolean;
  modelPanelOpen: boolean;
  vcsPanelOpen: boolean;
  pendingApproval: ChatMessage | undefined;
  approvalMinimized: boolean;
  isolationSession?: IsolationSessionSummary;
  onApprovalMinimize(): void;
  onApprovalRestore(): void;
  onApprovalResolved(): void;
  onOpenSettingsPage(page?: SettingsPageId): void;
}) {
  if (!modelPanelOpen && !vcsPanelOpen && !isolationSession && !(pendingApproval && approvalMinimized)) {
    return undefined;
  }

  return (
    <div className={styles.composerNoticeStack}>
      {isolationSession ? <IsolationChatNotice session={isolationSession} /> : null}
      {modelPanelOpen ? <ModelSettingsPanel state={state} minimized={composerMinimized} /> : null}
      {vcsPanelOpen ? (
        <VcsControls state={state} minimized={composerMinimized} onOpenVcsSettings={() => onOpenSettingsPage('vcs')} />
      ) : null}
      {pendingApproval && approvalMinimized ? (
        <ApprovalPromptModal
          message={pendingApproval}
          settings={state.approvalNotificationSettings}
          minimized
          onMinimize={onApprovalMinimize}
          onRestore={onApprovalRestore}
          onResolved={onApprovalResolved}
        />
      ) : null}
    </div>
  );
}

/**
 * Что это: плашка режима Docker-чата над стандартным Composer.
 * Зачем нужно: пользователь видит, что обычный чат сейчас управляет isolated-сессией, а не локальным workspace-run.
 * Какую продуктовую проблему решает: follow-up и stop выглядят привычно, но безопасно направляются в Docker-агента.
 */
function IsolationChatNotice({ session }: { session: IsolationSessionSummary }) {
  const active = isIsolationSessionActive({ status: session.status });

  return (
    <div className={styles.isolationNotice}>
      <Server size={14} />
      <div className={styles.isolationNoticeText}>
        <Text variant="bodyStrong">Docker isolated chat</Text>
        <Text variant="caption">
          {active
            ? 'Standard chat is watching the agent inside Docker. Stop stays in this isolated session; new prompts unlock after the run finishes.'
            : 'This standard chat is linked to a finished Docker session. New prompt will continue the isolated branch.'}
        </Text>
      </div>
      <Badge tone={getIsolationNoticeTone({ session })}>{session.status}</Badge>
    </div>
  );
}

/**
 * Что это: выбирает цвет статуса isolated-чата.
 * Зачем нужно: плашка в стандартном чате использует те же продуктовые смыслы, что и список сессий.
 * Какую продуктовую проблему решает: пользователь быстро отличает активный Docker-run от ошибки или готового результата.
 */
function getIsolationNoticeTone({ session }: { session: IsolationSessionSummary }): BadgeTone {
  if (session.status === 'ready_for_review') return 'success';
  if (session.status === 'failed') return 'danger';
  if (isIsolationSessionActive({ status: session.status })) return 'warning';
  return 'neutral';
}
