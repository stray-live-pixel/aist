import { GitBranch, GitCommitHorizontal, GitMerge, GitPullRequestCreate, RefreshCw } from 'lucide-react';
import { memo } from 'react';

import { agentActions } from '../../../shared/lib/agentActions';
import { type AgentState } from '../../../shared/types';
import { CompactNavigationButton } from '../../../shared/ui';
import styles from '../ChatPage.module.scss';

export const VcsControls = memo(function VcsControls({ state, minimized }: { state: AgentState; minimized: boolean }) {
  const vcs = state.activeChat.vcs;
  const branchLabel = vcs?.branch || 'VCS';
  const disabled = state.activeChat.busy;
  const className = [styles.vcsControlsFloat, minimized ? styles.vcsControlsFloatCollapsed : undefined]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} aria-label="VCS controls" aria-hidden={minimized}>
      <button
        type="button"
        className={styles.vcsBranchButton}
        title={vcs ? `${vcs.command}: ${vcs.branch}` : 'Refresh VCS branch'}
        onClick={() => agentActions.refreshVcs()}
      >
        <GitBranch size={12} />
        <span>{branchLabel}</span>
        <RefreshCw size={10} />
      </button>
      <CompactNavigationButton
        icon={<GitPullRequestCreate size={12} />}
        title="New isolated branch"
        disabled={disabled}
        onClick={() => agentActions.isolateChatVcs()}
      />
      <CompactNavigationButton
        icon={<GitCommitHorizontal size={12} />}
        title="Commit and push -f"
        disabled={disabled}
        onClick={() => agentActions.commitAndForcePushVcs()}
      />
      <CompactNavigationButton
        icon={<GitMerge size={12} />}
        title="Merge to main through current agent"
        disabled={disabled}
        onClick={() => agentActions.mergeToMainVcs()}
      />
    </div>
  );
});
