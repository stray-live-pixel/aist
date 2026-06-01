import { DoctorCheck } from './DoctorCheck';
import { DoctorResult } from './DoctorResult';
import { RunCliOptions } from './RunCliOptions';
import { checkCreatableDirectory } from './checkCreatableDirectory';
import { checkDirectoryExists } from './checkDirectoryExists';
import { resolveCliPaths } from './resolveCliPaths';

export async function runDoctor(
  options: Pick<RunCliOptions, 'cwd' | 'homeDir'> & { workspace?: string } = {}
): Promise<DoctorResult> {
  const paths = resolveCliPaths(options);
  const workspaceRootCheck = await checkDirectoryExists('workspace root', paths.workspaceRoot);
  const checks: DoctorCheck[] = [workspaceRootCheck];

  if (workspaceRootCheck.status === 'ok') {
    checks.push(await checkCreatableDirectory('workspace .aist-agent', paths.workspaceAistRoot));
  } else {
    checks.push({
      name: 'workspace .aist-agent',
      status: 'fail',
      message: `skipped because workspace root is unavailable: ${paths.workspaceAistRoot}`
    });
  }

  checks.push(await checkCreatableDirectory('global .aist-agent', paths.globalAistRoot));

  return {
    ok: checks.every((check) => check.status === 'ok'),
    paths: {
      workspaceRoot: paths.workspaceRoot,
      workspaceAistRoot: paths.workspaceAistRoot,
      globalAistRoot: paths.globalAistRoot
    },
    checks
  };
}
