import type { AgentSkill } from '../../../../core/features/skills/skills';
import type { LocalDockerIsolationProvider } from '../LocalDockerIsolationProvider';

/**
 * Что это: запускает пользовательский skill внутри контейнера.
 * Зачем нужно: skill-команды должны исполняться рядом с cloned repo, а не на компьютере пользователя.
 * Какую продуктовую проблему решает: remote-ready isolated agent сохраняет совместимость с custom skills без host filesystem.
 */
export async function runContainerSkillTool({
  skills,
  args,
  dockerProvider,
  containerName
}: {
  skills: readonly AgentSkill[];
  args: Record<string, unknown>;
  dockerProvider: LocalDockerIsolationProvider;
  containerName: string;
}): Promise<Record<string, unknown>> {
  const skillId = typeof args.skillId === 'string' ? args.skillId : '';
  const skill = skills.find((item) => item.id === skillId);
  if (!skill) {
    return { ok: false, error: { code: 'INVALID_ARGUMENT', message: `Unknown skill: ${skillId}` } };
  }

  const stdin = typeof args.input === 'string' ? args.input : '';
  const cwd = typeof args.cwd === 'string' && args.cwd.trim() ? args.cwd : '.';
  const timeoutMs = clampNumber({ value: args.timeoutMs, fallback: 30000, min: 1000, max: 120000 });
  const maxOutputChars = clampNumber({ value: args.maxOutputChars, fallback: 200000, min: 1000, max: 1000000 });
  const result = await dockerProvider.exec({
    container: containerName,
    cwd,
    timeoutMs,
    maxOutputChars,
    stdin,
    script: buildSkillScript({ skill, stdin })
  });

  return {
    ok: result.ok,
    ...getProcessFailure({ ok: result.ok, timedOut: result.timedOut, exitCode: result.exitCode, signal: result.signal }),
    skillId: skill.id,
    label: skill.label,
    cwd,
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    durationMs: result.durationMs,
    stdout: result.stdout,
    stderr: result.stderr,
    stdoutTruncated: false,
    stderrTruncated: false
  };
}

function buildSkillScript({ skill, stdin }: { skill: AgentSkill; stdin: string }): string {
  return [
    `export AIST_SKILL_ID=${quote(skill.id)}`,
    `export AIST_SKILL_LABEL=${quote(skill.label)}`,
    `export AIST_SKILL_INPUT=${quote(stdin)}`,
    skill.command
  ].join('\n');
}

function getProcessFailure({
  ok,
  timedOut,
  exitCode,
  signal
}: {
  ok: boolean;
  timedOut: boolean;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}): Record<string, unknown> {
  if (ok) {
    return {};
  }

  return {
    code: timedOut ? 'TIMEOUT' : 'INVALID_ARGUMENT',
    error: timedOut ? 'Skill process timed out.' : `Skill process exited with code ${exitCode ?? signal ?? 'unknown'}.`
  };
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function clampNumber({ value, fallback, min, max }: { value: unknown; fallback: number; min: number; max: number }): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(numeric)));
}
