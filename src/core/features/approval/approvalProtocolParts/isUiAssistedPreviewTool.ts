import { UI_ASSISTED_PREVIEW_TOOLS } from './UI_ASSISTED_PREVIEW_TOOLS';

export function isUiAssistedPreviewTool(toolName: string): boolean {
  return UI_ASSISTED_PREVIEW_TOOLS.has(toolName);
}
