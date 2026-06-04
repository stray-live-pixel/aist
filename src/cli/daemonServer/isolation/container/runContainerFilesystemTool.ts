import type { LocalDockerIsolationProvider } from '../LocalDockerIsolationProvider';

/**
 * Что это: исполняет файловый инструмент через AIST CLI внутри контейнера.
 * Зачем нужно: list/read/write/grep должны работать с клонированным репозиторием внутри Docker, а не с host path.
 * Какую продуктовую проблему решает: ход работы агента можно перенести на удалённый сервер, сохранив live events в локальном daemon.
 */
export async function runContainerFilesystemTool({
  dockerProvider,
  containerName,
  toolName,
  args
}: {
  dockerProvider: LocalDockerIsolationProvider;
  containerName: string;
  toolName: string;
  args: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const result = await dockerProvider.exec({
    container: containerName,
    cwd: '.',
    timeoutMs: 120000,
    maxOutputChars: 2000000,
    stdin: `${JSON.stringify({ toolName, args })}\n`,
    script: buildToolProxyScript()
  });
  if (!result.ok) {
    return {
      ok: false,
      error: {
        code: result.timedOut ? 'TIMEOUT' : 'CONTAINER_TOOL_FAILED',
        message: result.stderr.trim() || `Container filesystem tool ${toolName} failed.`
      },
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      timedOut: result.timedOut,
      durationMs: result.durationMs
    };
  }

  return parseContainerToolOutput({ toolName, stdout: result.stdout });
}

function buildToolProxyScript(): string {
  return `node -e ${quote(getToolProxyNodeCode())}`;
}

function getToolProxyNodeCode(): string {
  return [
    'const { runNodeFilesystemTool } = require("/workspace/dist/cli/main.js");',
    'let input = "";',
    'process.stdin.setEncoding("utf8");',
    'process.stdin.on("data", (chunk) => { input += chunk; });',
    'process.stdin.on("end", async () => {',
    '  try {',
    '    const payload = JSON.parse(input || "{}");',
    '    const result = await runNodeFilesystemTool({',
    '      context: { workspaceRoot: "/workspace", workspaceName: "workspace" },',
    '      toolName: payload.toolName,',
    '      args: payload.args || {}',
    '    });',
    '    process.stdout.write(JSON.stringify(result));',
    '  } catch (error) {',
    '    process.stderr.write(error && error.stack ? error.stack : String(error));',
    '    process.exitCode = 1;',
    '  }',
    '});'
  ].join('\n');
}

function parseContainerToolOutput({ toolName, stdout }: { toolName: string; stdout: string }): Record<string, unknown> {
  try {
    return JSON.parse(stdout.trim() || '{}') as Record<string, unknown>;
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'INVALID_CONTAINER_TOOL_OUTPUT',
        message: `Container filesystem tool ${toolName} returned invalid JSON: ${formatError(error)}`
      },
      stdout
    };
  }
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
