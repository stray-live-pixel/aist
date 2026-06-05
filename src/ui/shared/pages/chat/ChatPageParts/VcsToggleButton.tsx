import { GitBranch } from 'lucide-react';
import { memo } from 'react';

import { type AgentState } from '../../../shared/types';
import { CompactNavigationButton } from '../../../shared/ui';

export const VcsToggleButton = memo(function VcsToggleButton({
  state,
  open,
  onToggle,
  onOpenVcsSettings
}: {
  state: AgentState;
  open: boolean;
  onToggle(): void;
  onOpenVcsSettings(): void;
}) {
  const branch = state.activeChat.vcs?.branch;
  const shortBranch = branch ? (branch.length > 8 ? branch.slice(-8) : branch) : 'VCS';
  const title = branch ? (open ? `Hide VCS controls: ${branch}` : `Show VCS controls: ${branch}`) : 'Open VCS settings';

  return (
    <CompactNavigationButton
      icon={<GitBranch size={12} />}
      label={shortBranch}
      title={title}
      onClick={branch ? onToggle : onOpenVcsSettings}
    />
  );
});
