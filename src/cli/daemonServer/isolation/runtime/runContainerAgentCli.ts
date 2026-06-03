import type { RuntimeEvent } from '../../../../core/shared/types/types';
import type { LocalDockerIsolationProvider } from '../LocalDockerIsolationProvider';

/**
 * Что это: запускает headless AIST CLI внутри автономного контейнера и отдаёт runtime events по мере появления.
 * Зачем нужно: агент работает внутри clone из GitHub, а локальный daemon только наблюдает за JSONL-потоком.
 * Какую продуктовую проблему решает: isolation становится готовым к запуску на удалённых Docker hosts/servers.
 */
export async function runContainerAgentCli({
  dockerProvider,
  containerName,
  chatId,
  prompt,
  onEvent,
  onLog,
  registerStopHandler
}: {
  dockerProvider: LocalDockerIsolationProvider;
  containerName: string;
  chatId: string;
  prompt: string;
  onEvent: (event: RuntimeEvent) => Promise<void>;
  onLog?: (level: 'info' | 'warn' | 'error', message: string) => Promise<void>;
  registerStopHandler?: (handler: () => void) => void;
}): Promise<{ runId?: string; answer?: string }> {
  const state: { runId?: string; answer?: string; stdoutBuffer: string; eventQueue: Promise<void> } = {
    stdoutBuffer: '',
    eventQueue: Promise.resolve()
  };
  const handle = dockerProvider.spawn({
    container: containerName,
    script: createAskScript({ chatId, prompt }),
    cwd: '/workspace',
    timeoutMs: 30 * 60 * 1000,
    maxOutputChars: 1000000,
    onStdout: (chunk) => {
      state.stdoutBuffer = consumeJsonlChunk({ buffer: state.stdoutBuffer + chunk, onEvent, state });
    },
    onStderr: (chunk) => {
      void onLog?.('warn', chunk.trim());
    }
  });
  registerStopHandler?.(() => handle.stop());
  const result = await handle.completed;
  if (state.stdoutBuffer.trim()) {
    consumeJsonlChunk({ buffer: `${state.stdoutBuffer}\n`, onEvent, state });
  }
  await state.eventQueue;
  if (!result.ok) {
    throw new Error(`Container agent CLI failed: ${result.stderr || result.stdout || 'unknown error'}`);
  }
  return { runId: state.runId, answer: state.answer };
}

/**
 * Что это: разбирает stdout JSONL без ожидания завершения процесса.
 * Зачем нужно: CLI может отдавать events частями, а Docker stdout chunk boundaries не совпадают со строками.
 * Какую продуктовую проблему решает: live-чат обновляется быстро и без повреждения неполных JSON строк.
 */
function consumeJsonlChunk({
  buffer,
  onEvent,
  state
}: {
  buffer: string;
  onEvent: (event: RuntimeEvent) => Promise<void>;
  state: { runId?: string; answer?: string; eventQueue: Promise<void> };
}): string {
  const lines = buffer.split('\n');
  const tail = lines.pop() || '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const event = parseRuntimeEvent(trimmed);
    if (!event) {
      continue;
    }
    if (event.type === 'run.started') {
      state.runId = event.run.id;
    }
    if (event.type === 'run.finished') {
      state.answer = event.answer;
    }
    if (event.type === 'run.completed') {
      state.answer = event.answer;
    }
    state.eventQueue = state.eventQueue.then(() => onEvent(event));
  }
  return tail;
}

function parseRuntimeEvent(line: string): RuntimeEvent | undefined {
  try {
    const parsed = JSON.parse(line) as { type?: unknown };
    return typeof parsed.type === 'string' ? (parsed as RuntimeEvent) : undefined;
  } catch {
    return undefined;
  }
}

function createAskScript({ chatId, prompt }: { chatId: string; prompt: string }): string {
  return `aist chat ask ${shellQuote(chatId)} --workspace /workspace --jsonl --approval-mode auto-all --prompt ${shellQuote(prompt)}`;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}
