import { EDIT_TOOL_NAMES } from './EDIT_TOOL_NAMES';

export function isEditTool(toolName: string): boolean {
  return EDIT_TOOL_NAMES.has(toolName);
}
