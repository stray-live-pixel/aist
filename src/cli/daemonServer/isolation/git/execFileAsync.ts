import { execFile } from 'node:child_process';

export type ExecFileResult = {
  readonly stdout: string;
  readonly stderr: string;
};

export function execFileAsync({
  file,
  args,
  cwd,
  env
}: {
  file: string;
  args: readonly string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
}): Promise<ExecFileResult> {
  return new Promise((resolve, reject) => {
    execFile(file, [...args], { cwd, env }, (error, stdout, stderr) => {
      const out = stdout.toString();
      const err = stderr.toString();
      if (error) {
        reject(new Error(`${file} ${args.join(' ')} failed: ${err || error.message}`));
        return;
      }

      resolve({ stdout: out, stderr: err });
    });
  });
}
