import type { AgentState, ChatMessage } from '../../../shared/types';
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
  onApprovalMinimize(): void;
  onApprovalRestore(): void;
  onApprovalResolved(): void;
  onOpenSettingsPage(page?: SettingsPageId): void;
}) {
  if (!modelPanelOpen && !vcsPanelOpen && !(pendingApproval && approvalMinimized)) {
    return undefined;
  }

  return (
    <div className={styles.composerNoticeStack}>
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
