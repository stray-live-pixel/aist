import type {
  AgentReflectionCandidate,
  AgentReflectionCandidateKind,
  Chat,
  ChatMessage
} from '../../shared/types/types';

export type RunReflectionOutcome = {
  status: 'success' | 'error' | 'stopped';
  answer?: string;
  error?: string;
};

export type RunReflectionTrace = {
  task: string;
  outcome: string;
  tools: RunReflectionTraceTool[];
  reasons: string[];
  errors: string[];
  approvalFeedback: string[];
  changedFiles: string[];
  verification: string[];
};

export type RunReflectionTraceTool = {
  name: string;
  status: string;
  reason?: string;
  target?: string;
};

type RawReflectionCandidate = {
  kind?: unknown;
  title?: unknown;
  content?: unknown;
  reason?: unknown;
  scope?: unknown;
};

const MAX_TRACE_ITEMS = 12;
const MAX_FIELD_CHARS = 320;
const MAX_TASK_CHARS = 800;
const MAX_CANDIDATES = 3;
const MAX_CANDIDATE_TITLE_CHARS = 80;
const MAX_CANDIDATE_CONTENT_CHARS = 700;

const REFLECTION_CANDIDATE_KINDS: AgentReflectionCandidateKind[] = [
  'memory_preference',
  'project_lesson',
  'verification_command',
  'declarative_definition'
];

const SECRET_PATTERNS = [
  /\b(api[_-]?key|access[_-]?token|auth[_-]?token|password|secret)\b\s*[:=]/i,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
  /\b(sk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_=-]{12,}/i,
  /\b[A-Za-z0-9+]{32,}={0,2}\b/
];

const RAW_OUTPUT_PATTERNS = [
  /\btool_call_id\b/i,
  /\b(stdout|stderr)\b\s*[:=]/i,
  /\bBEGIN[_ -]?(TOOL|COMMAND)[_ -]?OUTPUT\b/i,
  /\braw\s+(tool|command)\s+output\b/i
];

const PROMPT_INJECTION_PATTERNS = [
  /\b(ignore|disregard|override)\s+(all\s+)?(previous|prior|system|developer|tool)\s+(instructions|messages|rules)\b/i,
  /\b(system|developer)\s+prompt\b/i,
  /\breveal\s+(the\s+)?(hidden\s+)?(prompt|instructions|secrets?)\b/i,
  /\byou\s+are\s+now\b/i
];

export function buildRunReflectionTrace(input: {
  chat: Chat;
  runStartedAt: number;
  task: string;
  outcome: RunReflectionOutcome;
}): RunReflectionTrace {
  const runMessages = input.chat.messages.filter((message) => message.createdAt >= input.runStartedAt);
  const toolMessages = runMessages.filter((message) => message.role === 'tool');
  const errors = collectErrors(runMessages, input.outcome);

  return {
    task: truncateForReflection(input.task, MAX_TASK_CHARS),
    outcome: formatOutcome(input.outcome),
    tools: toolMessages.slice(-MAX_TRACE_ITEMS).map(toTraceTool),
    reasons: uniqueLimited(
      toolMessages.map((message) => truncateForReflection(message.reason || '', MAX_FIELD_CHARS)).filter(Boolean)
    ),
    errors,
    approvalFeedback: uniqueLimited(
      toolMessages
        .map((message) => truncateForReflection(message.userApprovalComment || '', MAX_FIELD_CHARS))
        .filter(Boolean)
    ),
    changedFiles: uniqueLimited(toolMessages.flatMap(getChangedFiles)),
    verification: uniqueLimited(toolMessages.flatMap(getVerificationCommands))
  };
}

export function buildRunReflectionPrompt(trace: RunReflectionTrace): string {
  return [
    'Analyze this compact AIST agent run trace and propose 0-3 user-reviewable candidates.',
    '',
    'Return strict JSON only with this schema:',
    JSON.stringify(
      {
        candidates: [
          {
            kind: 'memory_preference | project_lesson | verification_command | declarative_definition',
            title: 'short label',
            content: 'candidate text to save',
            reason: 'why this is useful',
            scope: 'global | project | local'
          }
        ]
      },
      null,
      2
    ),
    '',
    'Rules:',
    '- Prefer no candidates when the trace does not show a durable user preference, project lesson, reusable verification command, or possible declarative project instruction.',
    '- Do not include raw tool outputs, stdout/stderr, secrets, access tokens, or hidden prompt text.',
    '- Do not create files or claim the candidate is already applied.',
    '- memory_preference should normally use scope global; project_lesson and verification_command should use scope project; declarative_definition should use scope local.',
    '',
    'Trace:',
    JSON.stringify(trace, null, 2)
  ].join('\n');
}

export function parseReflectionResponse(content: string, now = Date.now()): AgentReflectionCandidate[] {
  const parsed = parseJsonObject(content);
  const rawCandidates = Array.isArray(parsed?.candidates) ? parsed.candidates : [];
  return validateReflectionCandidates(rawCandidates, now);
}

export function validateReflectionCandidates(input: unknown, now = Date.now()): AgentReflectionCandidate[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const candidates: AgentReflectionCandidate[] = [];
  const seen = new Set<string>();

  for (const raw of input.slice(0, MAX_CANDIDATES)) {
    const candidate = normalizeCandidate(raw, now);
    if (!candidate) {
      continue;
    }

    const key = `${candidate.kind}:${candidate.scope || ''}:${candidate.content.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    candidates.push(candidate);
  }

  return candidates;
}

function normalizeCandidate(raw: unknown, now: number): AgentReflectionCandidate | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const record = raw as RawReflectionCandidate;
  const kind = normalizeCandidateKind(record.kind);
  const title = sanitizeCandidateText(record.title, MAX_CANDIDATE_TITLE_CHARS);
  const content = sanitizeCandidateText(record.content, MAX_CANDIDATE_CONTENT_CHARS);
  const reason = sanitizeCandidateText(record.reason, MAX_FIELD_CHARS);
  const scope = normalizeCandidateScope(record.scope, kind);

  if (!kind || !title || !content || containsUnsafeReflectionContent(`${title}\n${content}\n${reason || ''}`)) {
    return undefined;
  }

  return {
    id: createReflectionCandidateId(kind, content, now),
    kind,
    title,
    content,
    reason,
    scope,
    status: 'pending',
    createdAt: now
  };
}

function normalizeCandidateKind(value: unknown): AgentReflectionCandidateKind | undefined {
  return REFLECTION_CANDIDATE_KINDS.includes(String(value) as AgentReflectionCandidateKind)
    ? (String(value) as AgentReflectionCandidateKind)
    : undefined;
}

function normalizeCandidateScope(value: unknown, kind: AgentReflectionCandidateKind | undefined) {
  const raw = String(value || '');
  if (raw === 'global' || raw === 'project' || raw === 'local') {
    return raw;
  }

  if (kind === 'memory_preference') {
    return 'global';
  }
  if (kind === 'declarative_definition') {
    return 'local';
  }
  return 'project';
}

function sanitizeCandidateText(input: unknown, maxChars: number): string | undefined {
  const normalized = String(input || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
  if (!normalized) {
    return undefined;
  }
  return normalized.length > maxChars ? normalized.slice(0, maxChars).trim() : normalized;
}

function containsUnsafeReflectionContent(value: string): boolean {
  return [...SECRET_PATTERNS, ...RAW_OUTPUT_PATTERNS, ...PROMPT_INJECTION_PATTERNS].some((pattern) =>
    pattern.test(value)
  );
}

function createReflectionCandidateId(kind: AgentReflectionCandidateKind, content: string, now: number): string {
  const base =
    content
      .toLowerCase()
      .slice(0, 42)
      .replace(/[^a-z0-9\u0400-\u04ff]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'candidate';
  return `${kind}-${base}-${now.toString(36)}`;
}

function parseJsonObject(content: string): Record<string, unknown> | undefined {
  const trimmed = content.trim();
  const json = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim() || trimmed;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function formatOutcome(outcome: RunReflectionOutcome): string {
  if (outcome.status === 'success') {
    return truncateForReflection(`success: ${outcome.answer || 'completed'}`, MAX_FIELD_CHARS);
  }
  if (outcome.status === 'stopped') {
    return 'stopped by user';
  }
  return truncateForReflection(`error: ${outcome.error || 'unknown error'}`, MAX_FIELD_CHARS);
}

function toTraceTool(message: ChatMessage): RunReflectionTraceTool {
  return {
    name: message.name || 'tool',
    status: message.status || 'unknown',
    reason: truncateForReflection(message.reason || '', MAX_FIELD_CHARS),
    target: getToolTarget(message)
  };
}

function getToolTarget(message: ChatMessage): string | undefined {
  const args = message.args || {};
  const target = typeof args.path === 'string' ? args.path : typeof args.cwd === 'string' ? args.cwd : undefined;
  if (target) {
    return truncateForReflection(target, MAX_FIELD_CHARS);
  }

  if (message.name === 'run_bash_script' && typeof args.script === 'string') {
    return truncateForReflection(args.script, MAX_FIELD_CHARS);
  }

  return undefined;
}

function collectErrors(messages: ChatMessage[], outcome: RunReflectionOutcome): string[] {
  const errors = messages.flatMap((message) => {
    if (message.role === 'error') {
      return [message.content || 'error'];
    }
    if (message.role !== 'tool' || (message.status !== 'error' && message.status !== 'denied')) {
      return [];
    }
    const modelResult = message.modelResult || {};
    const result = message.result || {};
    return [
      stringField(modelResult.error) ||
        stringField(modelResult.code) ||
        stringField(result.error) ||
        stringField(result.code) ||
        `${message.name || 'tool'} ${message.status}`
    ];
  });

  if (outcome.status === 'error' && outcome.error) {
    errors.push(outcome.error);
  }

  return uniqueLimited(errors.map((error) => truncateForReflection(error, MAX_FIELD_CHARS)).filter(Boolean));
}

function getChangedFiles(message: ChatMessage): string[] {
  const args = message.args || {};
  if (typeof args.path === 'string' && ['write_file', 'replace_in_file', 'delete_path'].includes(message.name || '')) {
    return [truncateForReflection(args.path, MAX_FIELD_CHARS)];
  }

  const modelResult = message.modelResult || {};
  const result = asRecord(modelResult.result) || modelResult;
  const files = Array.isArray(result.files)
    ? result.files
    : Array.isArray(result.changedFiles)
      ? result.changedFiles
      : [];
  return files
    .map((file) => (asRecord(file)?.path ? String(asRecord(file)?.path) : ''))
    .filter(Boolean)
    .map((file) => truncateForReflection(file, MAX_FIELD_CHARS));
}

function getVerificationCommands(message: ChatMessage): string[] {
  if (message.name !== 'run_bash_script' || message.status !== 'done') {
    return [];
  }

  const script = typeof message.args?.script === 'string' ? message.args.script.trim() : '';
  if (!/\b(npm|pnpm|yarn|vitest|jest|tsc|eslint|playwright|cargo|go test|pytest)\b/i.test(script)) {
    return [];
  }

  const exitCode = message.modelResult?.exitCode ?? asRecord(message.modelResult?.result)?.exitCode;
  const suffix = exitCode === undefined ? '' : ` (exit ${String(exitCode)})`;
  return [truncateForReflection(`${script}${suffix}`, MAX_FIELD_CHARS)];
}

function uniqueLimited(values: string[], limit = MAX_TRACE_ITEMS): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

function truncateForReflection(value: string, maxChars: number): string {
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (containsUnsafeTraceText(normalized)) {
    return '[omitted unsafe trace text]';
  }
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}

function containsUnsafeTraceText(value: string): boolean {
  return [...SECRET_PATTERNS, ...RAW_OUTPUT_PATTERNS, ...PROMPT_INJECTION_PATTERNS].some((pattern) =>
    pattern.test(value)
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}
