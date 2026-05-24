import { Copy } from 'lucide-react';

import { useI18n } from '../../shared/i18n';
import { vscode } from '../../shared/lib/vscode';
import { IconButton } from '../../shared/ui/IconButton';

type CopyMessageButtonProps = {
  markdown: string;
};

export function CopyMessageButton({ markdown }: CopyMessageButtonProps) {
  const { t } = useI18n();

  return (
    <IconButton
      title={t('message.copyMarkdown')}
      disabled={!markdown}
      onClick={() => vscode.postMessage({ type: 'copyMessage', markdown })}
    >
      <Copy size={15} />
    </IconButton>
  );
}
