import { ChevronRight, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';

import { MessageCard } from '../../entities/message/MessageCard';
import { useI18n } from '../../shared/i18n';
import type { ChatMessage } from '../../shared/types';

type ToolCallsCutProps = {
  tools: ChatMessage[];
  userMessage?: ChatMessage;
  assistantMessage?: ChatMessage;
  active: boolean;
};

/**
 * Что это: общий cut для tool-call сообщений одного пользовательского запроса.
 * Зачем нужно: история остаётся читаемой: инструменты видны во время работы,
 * а после итогового ответа агента сворачиваются в компактный блок.
 * Пример: шеврон раскрывает список tool-call карточек, пока закрытый cut их не рендерит.
 */
export function ToolCallsCut({ tools, userMessage, assistantMessage, active }: ToolCallsCutProps) {
  const shouldBeOpen = active || !assistantMessage;
  const [open, setOpen] = useState(shouldBeOpen);

  useEffect(() => {
    setOpen(shouldBeOpen);
  }, [shouldBeOpen]);

  if (!tools.length) {
    return null;
  }

  return (
    <article className="tool-calls-cut">
      <ToolCallsCutHeader
        open={open}
        meta={formatToolCallsMeta(tools, userMessage, assistantMessage)}
        onToggle={() => setOpen((value) => !value)}
      />
      {open ? (
        <div className="tool-calls-cut-body">
          {tools.map((tool) => (
            <MessageCard key={tool.id} message={tool} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ToolCallsCutHeader({ open, meta, onToggle }: ToolCallsCutHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="tool-calls-cut-header">
      <button
        className="tool-chevron-button"
        title={open ? t('toolCalls.hide') : t('toolCalls.show')}
        aria-expanded={open}
        onClick={onToggle}
      >
        <ChevronRight size={14} />
      </button>
      <span className="tool-calls-cut-icon">
        <Wrench size={14} />
      </span>
      <span className="tool-calls-cut-title">{t('message.tool')}</span>
      <span className="tool-calls-cut-meta">{meta}</span>
    </div>
  );
}

function formatToolCallsMeta(tools: ChatMessage[], userMessage?: ChatMessage, assistantMessage?: ChatMessage): string {
  const countLabel = `${tools.length} ${tools.length === 1 ? 'tool' : 'tools'}`;
  const durationLabel = formatToolCallsDuration(userMessage, assistantMessage);

  return durationLabel ? `${countLabel} · ${durationLabel}` : countLabel;
}

function formatToolCallsDuration(userMessage?: ChatMessage, assistantMessage?: ChatMessage): string | undefined {
  if (!userMessage || !assistantMessage) {
    return undefined;
  }

  const durationMs = Math.max(0, assistantMessage.createdAt - userMessage.createdAt);
  return formatDuration(durationMs);
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

type ToolCallsCutHeaderProps = {
  open: boolean;
  meta: string;
  onToggle(): void;
};
