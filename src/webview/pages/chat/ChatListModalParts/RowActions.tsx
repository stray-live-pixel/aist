import { Copy, ExternalLink, Trash2 } from 'lucide-react';
import { memo } from 'react';

import { useI18n } from '../../../shared/i18n';
import { IconButton } from '../../../shared/ui/IconButton';

export const RowActions = memo(function RowActions({
  disabled,
  onDuplicate,
  onOpenInEditor,
  onDelete
}: {
  disabled: boolean;
  onDuplicate(): void;
  onOpenInEditor(): void;
  onDelete(): void;
}) {
  const { t } = useI18n();

  return (
    <>
      <IconButton title={t('chat.openInEditor')} onClick={onOpenInEditor}>
        <ExternalLink size={14} />
      </IconButton>
      <IconButton title={t('chatList.duplicate')} disabled={disabled} onClick={onDuplicate}>
        <Copy size={14} />
      </IconButton>
      <IconButton title={t('chatList.delete')} disabled={disabled} onClick={onDelete}>
        <Trash2 size={14} />
      </IconButton>
    </>
  );
});
