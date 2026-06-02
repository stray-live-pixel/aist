import { AutonomousStateCommandResult } from './AutonomousStateCommandResult';
import { formatJsonOutput } from './formatJsonOutput';

export function formatAutonomousListOutput(result: AutonomousStateCommandResult, json: boolean): string {
  if (json) {
    return formatJsonOutput(result);
  }

  const flowLines = result.state.definitions.flows.map(
    (flow) => `- ${flow.id}  stages: ${flow.stages.length}  source: ${flow.sourceKind}`
  );
  const runLines = result.state.definitions.runs.map(
    (run) => `- ${run.id}  tasks: ${run.tasks.length}  repeat: ${run.repeat}  source: ${run.sourceKind}`
  );
  const sessionLines = result.state.sessions.map(
    (session) => `- ${session.meta.id}  ${session.meta.kind}:${session.meta.targetId || '-'}  ${session.meta.status}`
  );

  return `AIST autonomous
Workspace: ${result.workspaceRoot}
Storage: ${result.state.storageRoot}

Flows (${result.state.definitions.flows.length})
${flowLines.length ? flowLines.join('\n') : '(none)'}

Runs (${result.state.definitions.runs.length})
${runLines.length ? runLines.join('\n') : '(none)'}

Sessions (${result.state.sessions.length})
${sessionLines.length ? sessionLines.join('\n') : '(none)'}
`;
}
