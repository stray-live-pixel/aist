import { X } from 'lucide-react';
import { useEffect } from 'react';

import type { AgentState } from '../../shared/types';
import { IconButton } from '../../shared/ui/IconButton';
import { PermissionsPage } from '../permissions/PermissionsPage';

type AgentSettingsModalProps = {
  state: AgentState;
  onClose(): void;
};

export function AgentSettingsModal({ state, onClose }: AgentSettingsModalProps) {
  useEffect(() => {
    const closeByEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', closeByEscape);
    return () => document.removeEventListener('keydown', closeByEscape);
  }, [onClose]);

  return (
    <div className="tool-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="tool-modal agent-settings-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="tool-modal-header">
          <div>
            <h2>Agent settings</h2>
            <p>These settings are available on demand so the chat keeps the main space.</p>
          </div>
          <IconButton title="Close settings" onClick={onClose}>
            <X size={15} />
          </IconButton>
        </div>
        <PermissionsPage
          tools={state.toolPermissions}
          maxToolIterations={state.maxToolIterations}
          agentLanguage={state.agentLanguage}
          agentMode={state.agentMode}
          agentModes={state.agentModes}
          customSkills={state.customSkills}
          codexAuthenticated={state.codexAuthenticated}
          permissionPresets={state.toolPermissionPresets}
          activePermissionPresetId={state.activeToolPermissionPresetId}
          variant="embedded"
        />
      </section>
    </div>
  );
}
