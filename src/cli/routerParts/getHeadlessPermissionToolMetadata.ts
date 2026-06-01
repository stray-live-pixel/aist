import { type ToolRegistry } from '../../core/features/tool-execution/toolRegistry';
import { type ToolPermissionMode } from '../../core/shared/types/types';

export function getHeadlessPermissionToolMetadata(
  toolRegistry: ToolRegistry
): Array<{ name: string; defaultPermission: ToolPermissionMode }> {
  const snapshot = toolRegistry.snapshot();
  const projectDefaults = new Map(snapshot.projectTools.map((tool) => [tool.id, tool.permission]));

  return snapshot.tools.map((tool) => ({
    name: tool.function.name,
    defaultPermission: projectDefaults.get(tool.function.name) || 'ask'
  }));
}
