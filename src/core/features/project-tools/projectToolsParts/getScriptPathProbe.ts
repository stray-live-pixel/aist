import { parseMarkdownFrontmatter } from '../../../shared/lib/frontmatter';
import { asNonEmptyString } from './asNonEmptyString';
import { resolveProjectToolScriptPath } from './resolveProjectToolScriptPath';

export function getScriptPathProbe(markdown: string, workspaceRoot: string, toolsRoot: string): string | undefined {
  try {
    const script = asNonEmptyString(parseMarkdownFrontmatter(markdown).attributes.script);
    if (!script) {
      return undefined;
    }
    const resolved = resolveProjectToolScriptPath(workspaceRoot, toolsRoot, script);
    return 'scriptPath' in resolved ? resolved.scriptPath : undefined;
  } catch {
    return undefined;
  }
}
