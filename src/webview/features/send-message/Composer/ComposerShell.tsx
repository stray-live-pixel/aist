import { ChevronUp } from 'lucide-react';
import type { ChangeEvent, DragEvent, KeyboardEvent, ReactNode, Ref } from 'react';

import type { AgentAttachment } from '../../../shared/types';
import { ComposerFrame, TextArea } from '../../../shared/ui';
import styles from '../Composer.module.scss';
import { AttachmentTray } from './AttachmentTray';
import { ComposerAttachButton } from './ComposerAttachButton';

/**
 * Что это: визуальный shell ComposerFrame с textarea, minimized strip и animation classes.
 * Зачем нужно: основной Composer управляет состоянием, а shell отвечает только за shared UI-композицию.
 * Какую продуктовую проблему решает: внешний вид composer остаётся VS Code-native и доступным с клавиатуры.
 */
export function ComposerShell({
  busy,
  floating,
  minimized,
  gradientWhileBusy,
  settings,
  footer,
  notice,
  fallback,
  placeholder,
  prompt,
  attachments,
  attachmentError,
  headerActions,
  actions,
  className,
  textareaRef,
  readOnly,
  onPromptChange,
  onPromptKeyDown,
  onPromptDragOver,
  onPromptDrop,
  onAttachmentInputChange,
  onRemoveAttachment
}: ComposerShellProps) {
  const footerContent = (
    <div className={styles.footerRow}>
      {!readOnly ? <ComposerAttachButton onAttachmentInputChange={onAttachmentInputChange} /> : null}
      {footer ? <div className={styles.footerContent}>{footer}</div> : null}
    </div>
  );
  const shellClassName = [
    className,
    minimized ? styles.composerMinimized : undefined,
    minimized && busy && gradientWhileBusy ? styles.composerMinimizedBusyGradient : undefined
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClassName || undefined} aria-expanded={!minimized}>
      <div className={styles.minimizedStrip} aria-hidden={!minimized}>
        <ChevronUp size={16} strokeWidth={2.4} />
      </div>
      <div className={styles.composerContent}>
        <ComposerFrame
          floating={floating}
          notice={notice}
          header={settings}
          headerActions={headerActions}
          fallback={fallback}
          input={
            <div className={styles.inputStack}>
              <AttachmentTray
                attachments={attachments}
                attachmentError={attachmentError}
                readOnly={readOnly}
                onRemoveAttachment={onRemoveAttachment}
              />
              <TextArea
                ref={textareaRef}
                variant="composer"
                placeholder={placeholder}
                rows={1}
                value={prompt}
                readOnly={readOnly}
                aria-hidden={readOnly || minimized}
                tabIndex={readOnly || minimized ? -1 : undefined}
                onChange={(event) => onPromptChange?.(event.target.value)}
                onKeyDown={(event) => !readOnly && onPromptKeyDown?.(event)}
                onDragOver={(event) => !readOnly && onPromptDragOver?.(event)}
                onDrop={(event) => !readOnly && onPromptDrop?.(event)}
              />
            </div>
          }
          footer={footerContent}
          actions={actions}
        />
      </div>
    </div>
  );
}

/**
 * Что это: props визуального shell Composer.
 * Зачем нужно: тип отделяет UI-параметры от controller hook.
 * Какую продуктовую проблему решает: exit и active composer используют один renderer с разными interaction props.
 */
type ComposerShellProps = {
  busy: boolean;
  floating: boolean;
  minimized: boolean;
  gradientWhileBusy: boolean;
  settings?: ReactNode;
  footer?: ReactNode;
  notice?: ReactNode;
  fallback: string;
  placeholder: string;
  prompt: string;
  attachments?: AgentAttachment[];
  attachmentError?: string;
  headerActions?: ReactNode;
  actions: ReactNode;
  className?: string;
  textareaRef?: Ref<HTMLTextAreaElement>;
  readOnly?: boolean;
  onPromptChange?(value: string): void;
  onPromptKeyDown?(event: KeyboardEvent<HTMLTextAreaElement>): void;
  onPromptDragOver?(event: DragEvent<HTMLTextAreaElement>): void;
  onPromptDrop?(event: DragEvent<HTMLTextAreaElement>): void;
  onAttachmentInputChange?(event: ChangeEvent<HTMLInputElement>): void;
  onRemoveAttachment?(attachmentId: string): void;
};
