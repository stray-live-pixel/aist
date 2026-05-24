import { X } from 'lucide-react';
import type { MouseEvent } from 'react';

import { useI18n } from '../../shared/i18n';
import type { ChatMessage } from '../../shared/types';

/**
 * Что это: модалка с сырым JSON tool-call.
 * Зачем нужно: JSON полезен для диагностики, но не должен занимать место в обычной истории чата.
 * Пример: кнопка </> в карточке инструмента открывает этот компонент поверх чата.
 */
export function ToolRawJsonModal({ message, onClose }: ToolRawJsonModalProps) {
  const { t } = useI18n();
  const raw = JSON.stringify(
    { tool: message.name, status: message.status, args: message.args, result: message.result },
    null,
    2
  );

  return (
    <div className="tool-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="tool-modal" role="dialog" aria-modal="true" onClick={stopPropagation}>
        <header className="tool-modal-header">
          <div>
            <h2>JSON</h2>
            <p>{message.name || 'tool call'}</p>
          </div>
          <button className="tool-icon-button" title={t('common.close')} onClick={onClose}>
            <X size={14} />
          </button>
        </header>
        <pre className="tool-modal-code">{raw}</pre>
      </section>
    </div>
  );
}

function stopPropagation(event: MouseEvent) {
  event.stopPropagation();
}

type ToolRawJsonModalProps = {
  message: ChatMessage;
  onClose(event?: MouseEvent): void;
};
