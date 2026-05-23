import { Copy } from 'lucide-react';
import { vscode } from '../../shared/lib/vscode';
import { IconButton } from '../../shared/ui/IconButton';

type CopyMessageButtonProps = {
  markdown: string;
};

export function CopyMessageButton({ markdown }: CopyMessageButtonProps) {
  return (
    <IconButton title="Copy markdown" disabled={!markdown} onClick={() => vscode.postMessage({ type: 'copyMessage', markdown })}>
      <Copy size={15} />
    </IconButton>
  );
}
