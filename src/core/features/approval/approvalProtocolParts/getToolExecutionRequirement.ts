import { type RuntimeClientCapabilities, type ToolExecutionRequirement } from '../../../shared/types/types';
import { AUTO_EXECUTABLE_TOOLS } from './AUTO_EXECUTABLE_TOOLS';
import { UI_ASSISTED_PREVIEW_TOOLS } from './UI_ASSISTED_PREVIEW_TOOLS';

export function getToolExecutionRequirement(
  toolName: string,
  clientCapabilities: RuntimeClientCapabilities = {}
): ToolExecutionRequirement {
  if (AUTO_EXECUTABLE_TOOLS.has(toolName)) {
    return { mode: 'auto' };
  }

  if (UI_ASSISTED_PREVIEW_TOOLS.has(toolName)) {
    return clientCapabilities.vscodeEditableDiffPreview
      ? { mode: 'ui-assisted-preview', previewKind: 'vscode-editable-diff' }
      : { mode: 'approval', previewKind: 'headless-diff-artifact' };
  }

  return { mode: 'approval', previewKind: 'none' };
}
