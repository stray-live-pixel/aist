import { toStructuredToolFailure } from '../../../shared/lib/toolErrors';
import { ProjectToolDefinition } from './ProjectToolDefinition';
import { executeProjectToolImpl } from './executeProjectToolImpl';

export async function executeProjectTool(
  definition: ProjectToolDefinition,
  args: Record<string, unknown>,
  workspaceRoot: string
): Promise<Record<string, unknown>> {
  try {
    return await executeProjectToolImpl(definition, args, workspaceRoot);
  } catch (error) {
    return toStructuredToolFailure(error);
  }
}
