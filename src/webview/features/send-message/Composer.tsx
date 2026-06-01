import { useI18n } from '../../shared/i18n';
import styles from './Composer.module.scss';
import { ComposerFooterActions, ComposerHeaderActions } from './Composer/ComposerActions';
import { ComposerShell } from './Composer/ComposerShell';
import { useComposerController } from './Composer/useComposerController';
import { PromptHistoryModal } from './PromptHistoryModal';
import type { ComposerProps } from './types';

/**
 * Что это: нижний composer для отправки prompt или остановки текущей генерации.
 * Зачем нужно: фасад собирает controller hook, shared UI shell и history modal без смешивания деталей поведения.
 * Какую продуктовую проблему решает: пользователь получает быстрый ввод, continue, history и Shift-drop путей в одном понятном UI.
 */
export function Composer({
  chatId,
  busy,
  floating = false,
  minimized = false,
  gradientWhileBusy = true,
  onSubmitPrompt,
  onStopRequested,
  settings,
  headerActions,
  footer,
  notice
}: ComposerProps) {
  const { t } = useI18n();
  const controller = useComposerController({ chatId, busy, onSubmitPrompt, onStopRequested });
  const composerHeaderActions = (
    <ComposerHeaderActions headerActions={headerActions} onOpenHistory={controller.openHistory} />
  );
  const actions = <ComposerFooterActions busy={busy} onSend={controller.sendPrompt} onStop={controller.requestStop} />;
  const commonShellProps = {
    busy,
    floating,
    minimized,
    gradientWhileBusy,
    settings,
    footer,
    notice,
    fallback: t('composer.noSettings'),
    placeholder: t('composer.placeholder'),
    headerActions: composerHeaderActions,
    actions
  };

  return (
    <>
      {controller.sentComposer ? (
        <ComposerShell
          key={controller.sentComposer.id}
          {...commonShellProps}
          prompt={controller.sentComposer.prompt}
          className={styles.composerExit}
          readOnly
        />
      ) : null}
      <ComposerShell
        {...commonShellProps}
        prompt={controller.prompt}
        className={controller.sentComposer ? styles.composerEnter : undefined}
        textareaRef={controller.textareaRef}
        onPromptChange={controller.updatePrompt}
        onPromptKeyDown={controller.handlePromptKeyDown}
        onPromptDragOver={controller.handlePromptDragOver}
        onPromptDrop={controller.handlePromptDrop}
      />
      {controller.historyOpen ? (
        <PromptHistoryModal
          history={controller.history}
          onClose={controller.closeHistory}
          onSelect={controller.selectHistoryPrompt}
        />
      ) : null}
    </>
  );
}
