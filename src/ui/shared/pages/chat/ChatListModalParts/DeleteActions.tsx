import { Check, X } from 'lucide-react';
import { memo } from 'react';

import { useI18n } from '../../../shared/i18n';
import { IconButton } from '../../../shared/ui/IconButton';

export const DeleteActions = memo(function DeleteActions({
  onCancel,
  onDelete
}: {
  onCancel(): void;
  onDelete(): void;
}) {
  const { t } = useI18n();

  return (
    <>
      <IconButton title={t('common.confirmDelete')} onClick={onDelete}>
        <Check size={14} />
      </IconButton>
      <IconButton title={t('common.cancelDelete')} onClick={onCancel}>
        <X size={14} />
      </IconButton>
    </>
  );
});
