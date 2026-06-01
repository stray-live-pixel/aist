import path from 'node:path';

import { PROJECT_TOOLS_RELATIVE_DIR } from './PROJECT_TOOLS_RELATIVE_DIR';
import { ProjectToolDiagnostic } from './ProjectToolDiagnostic';
import { isInside } from './isInside';

export function resolveProjectToolScriptPath(
  workspaceRoot: string,
  toolsRoot: string,
  script: string
): { scriptPath: string } | { diagnostic: ProjectToolDiagnostic } {
  if (path.isAbsolute(script) || script.includes('\0')) {
    return {
      diagnostic: {
        code: 'projectTool.scriptPathInvalid',
        message: 'Project tool script must be a relative path inside .aist-agent/tools.'
      }
    };
  }

  const normalizedScript = script.replace(/\\/g, '/').replace(/^\/+/, '');
  const base = normalizedScript.startsWith(`${PROJECT_TOOLS_RELATIVE_DIR.replace(/\\/g, '/')}/`)
    ? workspaceRoot
    : toolsRoot;
  const scriptPath = path.resolve(base, normalizedScript);
  if (!isInside(toolsRoot, scriptPath)) {
    return {
      diagnostic: {
        code: 'projectTool.scriptPathEscapesRoot',
        message: `Project tool script escapes .aist-agent/tools: ${script}`
      }
    };
  }

  return { scriptPath };
}
