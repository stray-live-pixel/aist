import { type ChatMessage } from '../../shared/types';
import { storyNow } from './storyNow';

export const storyToolMessages: Record<string, ChatMessage> = {
  waitingApproval: {
    id: 'tool-approval',
    role: 'tool',
    name: 'replace_in_file',
    status: 'waiting',
    approval: 'pending',
    reason: 'Need permission before changing source files.',
    nextStep: 'If approved, apply the replacement and inspect the changed CSS block.',
    args: { path: 'src/webview/app/styles.css', search: '.message-card', replace: '.message-card' },
    result: { preview: { path: 'src/webview/app/styles.css', replacements: 3 } },
    createdAt: storyNow - 1000 * 90
  },
  runningBash: {
    id: 'tool-bash',
    role: 'tool',
    name: 'run_bash_script',
    status: 'running',
    args: { script: 'npm run typecheck' },
    reason: 'Verifying TypeScript after Storybook setup.',
    nextStep: 'Use the compiler output to fix any remaining type errors.',
    createdAt: storyNow - 1000 * 70
  },
  finishedBash: {
    id: 'tool-bash-done',
    role: 'tool',
    name: 'run_bash_script',
    status: 'done',
    args: {
      script: 'npm run test -- --run src/webview/entities/message/toolValue.test.ts',
      cwd: '.',
      timeoutMs: 120000
    },
    result: {
      ok: true,
      cwd: '.',
      exitCode: 0,
      signal: null,
      timedOut: false,
      durationMs: 1840,
      stdout:
        '✓ src/webview/entities/message/toolValue.test.ts (4 tests) 12ms\n\nTest Files  1 passed (1)\nTests  4 passed (4)',
      stderr: '',
      stdoutTruncated: false,
      stderrTruncated: false
    },
    reason: 'Checking the parser helpers still behave correctly.',
    nextStep: 'Keep the change if tests pass, otherwise inspect the failing assertions.',
    createdAt: storyNow - 1000 * 55
  },
  approvedWithComment: {
    id: 'tool-approved-comment',
    role: 'tool',
    name: 'replace_in_file',
    status: 'done',
    approval: 'approved',
    reason: 'Apply the user-approved wording change.',
    nextStep: 'Verify the replacement count and preserve the public API name.',
    userApprovalComment: 'Keep the public API name unchanged.',
    args: { path: 'src/core/toolRunner.ts', search: 'userComment', replace: 'userApprovalComment' },
    result: {
      ok: true,
      path: 'src/core/toolRunner.ts',
      replacements: 3,
      userApprovalComment: 'Keep the public API name unchanged.'
    },
    createdAt: storyNow - 1000 * 50
  },
  errored: {
    id: 'tool-error',
    role: 'tool',
    name: 'delete_path',
    status: 'error',
    args: { path: 'dist/old.js' },
    result: { error: 'Permission denied by user.' },
    createdAt: storyNow - 1000 * 40
  },
  listFiles: {
    id: 'tool-list',
    role: 'tool',
    name: 'list_files',
    status: 'done',
    args: { path: 'src/webview' },
    result: {
      entries: [
        { path: 'src/webview/app', type: 'directory' },
        { path: 'src/webview/entities', type: 'directory' },
        { path: 'src/webview/features', type: 'directory' },
        { path: 'src/webview/widgets', type: 'directory' }
      ]
    },
    createdAt: storyNow - 1000 * 20
  }
};
