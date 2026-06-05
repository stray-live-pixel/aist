import { ChevronRight, Wrench } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { MessageCard } from '../../../entities/message';
import { useI18n } from '../../../i18n';
import styles from './ToolCallsCut.module.scss';
import { getToolCallIdsSignature } from './getToolCallIdsSignature';
import type { ToolCallsCutHeaderProps, ToolCallsCutProps } from './types';
import { formatToolCallsMeta } from './utils';

/**
 * Что это: общий cut для tool-call сообщений одного пользовательского запроса.
 * Зачем нужно: история остаётся читаемой: инструменты видны во время работы,
 * а после итогового ответа агента сворачиваются в компактный блок.
 * Пример: шеврон раскрывает список tool-call карточек, пока закрытый cut их не рендерит.
 */
export function ToolCallsCut({ tools, userMessage, assistantMessage, active, resolvedApprovalId }: ToolCallsCutProps) {
  const shouldBeOpen = active || !assistantMessage;
  const [open, setOpen] = useState(shouldBeOpen);
  const previousToolIdsRef = useRef<Set<string>>(new Set());
  const hasRenderedRef = useRef(false);
  const toolIdsSignature = getToolCallIdsSignature({ tools });
  const [newToolIds, setNewToolIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setOpen(shouldBeOpen);
  }, [shouldBeOpen]);

  useEffect(() => {
    const toolIds = tools.map((tool) => tool.id);
    const previousToolIds = previousToolIdsRef.current;
    const nextNewToolIds = hasRenderedRef.current
      ? new Set(toolIds.filter((toolId) => !previousToolIds.has(toolId)))
      : new Set<string>();

    // Новые tool-card анимируем только при изменении состава группы.
    // Без стабильной зависимости раскрытый cut мог бесконечно обновлять state
    // и нагружать CPU, особенно когда параллельно открыто несколько агентов.
    setNewToolIds(nextNewToolIds);
    previousToolIdsRef.current = new Set(toolIds);
    hasRenderedRef.current = true;
  }, [toolIdsSignature]);

  if (!tools.length) {
    return null;
  }

  return (
    <article className={styles.root}>
      <ToolCallsCutHeader
        open={open}
        meta={formatToolCallsMeta(tools, userMessage, assistantMessage)}
        onToggle={() => setOpen((value) => !value)}
      />
      {open ? (
        <div className={styles.body}>
          {tools.map((tool) => (
            <div key={tool.id} className={newToolIds.has(tool.id) ? styles.toolEnter : styles.toolItem}>
              <MessageCard message={tool} collapseToolId={resolvedApprovalId} />
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ToolCallsCutHeader({ open, meta, onToggle }: ToolCallsCutHeaderProps) {
  const { t } = useI18n();

  return (
    <div className={styles.header}>
      <button
        className={styles.chevronButton}
        title={open ? t('toolCalls.hide') : t('toolCalls.show')}
        aria-expanded={open}
        onClick={onToggle}
      >
        <ChevronRight size={14} />
      </button>
      <span className={styles.icon}>
        <Wrench size={14} />
      </span>
      <span className={styles.title}>{t('message.tool')}</span>
      <span className={styles.meta}>{meta}</span>
    </div>
  );
}
