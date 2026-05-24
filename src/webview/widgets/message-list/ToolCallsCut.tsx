import { ChevronRight, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';

import { MessageCard } from '../../entities/message/MessageCard';
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
 * Пример: <ToolCallsCut tools={tools} userMessage={user} assistantMessage={assistant} active={busy} />.
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
    <details className="tool-calls-cut" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="tool-calls-cut-summary">
        <ChevronRight className="tool-calls-cut-chevron" size={14} />
        <span className="tool-calls-cut-icon">
          <Wrench size={14} />
        </span>
        <span className="tool-calls-cut-title">Tool Calls</span>
        <span className="tool-calls-cut-meta">{formatToolCallsMeta(tools, userMessage, assistantMessage)}</span>
      </summary>
      <div className="tool-calls-cut-body">
        {tools.map((tool) => (
          <MessageCard key={tool.id} message={tool} />
        ))}
      </div>
    </details>
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
