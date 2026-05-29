import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Что это: завершает процессы, в command line которых есть уникальный marker тестовой сессии.
 * Зачем нужно: VS Code запускает несколько Helper-процессов, и после e2e они не должны оставаться открытыми.
 */
export async function killProcessesByCommandMarker({ marker }: { marker: string }): Promise<void> {
  if (process.platform === 'win32') {
    await killWindowsProcessesByCommandMarker({ marker });
    return;
  }

  await killPosixProcessesByCommandMarker({ marker });
}

async function killPosixProcessesByCommandMarker({ marker }: { marker: string }): Promise<void> {
  const { stdout } = await execFileAsync('ps', ['-axo', 'pid=,command=']).catch(() => ({ stdout: '' }));
  const currentPid = process.pid;
  const pids = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes(marker))
    .map((line) => Number(line.split(/\s+/, 1)[0]))
    .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== currentPid);

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // Процесс уже завершился между ps и kill.
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  for (const pid of pids) {
    try {
      process.kill(pid, 0);
      process.kill(pid, 'SIGKILL');
    } catch {
      // Процесс уже завершён.
    }
  }
}

async function killWindowsProcessesByCommandMarker({ marker }: { marker: string }): Promise<void> {
  const escapedMarker = marker.replace(/'/g, "''");
  const command = `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${escapedMarker}*' -and $_.ProcessId -ne ${process.pid} } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`;
  await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command]).catch(() => undefined);
}
