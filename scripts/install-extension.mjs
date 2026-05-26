import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const outDir = path.resolve(rootDir, process.env.VSIX_OUT_DIR ?? 'dist');
const vsixPath = path.join(outDir, `${packageJson.name}-${packageJson.version}.vsix`);
const restartLogPath = path.join(outDir, 'vscode-restart.log');
const codeCommand = process.env.VSCODE_CLI ?? 'code';
const skipInstall = process.argv.includes('--no-install');
const skipRestart = process.argv.includes('--no-restart');
const restartDelayMs = Number(process.env.VSCODE_RESTART_DELAY_MS ?? 2200);

/**
 * Запускает внешнюю CLI-команду синхронно, потому что сборка, упаковка и установка должны идти строго последовательно.
 * `shell` включён только на Windows: там npm/code часто доступны как shim-файлы, которые spawn без shell не находит.
 */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    shell: process.platform === 'win32',
    stdio: 'inherit',
    ...options
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/**
 * Запускает detached-helper, который переживёт закрытие integrated terminal внутри VS Code.
 *
 * Важный нюанс: `code --command workbench.action.quit` на macOS может тихо не закрыть уже запущенное окно,
 * поэтому helper делает platform-specific restart. На macOS используем AppleScript/open, потому что это штатный
 * способ закрыть именно application bundle VS Code и затем открыть workspace заново. CLI остаётся fallback'ом и
 * нужен для Linux/Windows, где application bundle нет.
 */
function restartVsCodeFully() {
  if (skipRestart) {
    console.log('Skipping VS Code restart because --no-restart was passed.');
    return;
  }

  const helperScript = `
const { appendFileSync } = require('node:fs');
const { spawn, spawnSync } = require('node:child_process');
const codeCommand = process.argv[1];
const workspacePath = process.argv[2];
const restartDelayMs = Number(process.argv[3] || 2200);
const logPath = process.argv[4];
const sleep = (milliseconds) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
const log = (message) => appendFileSync(logPath, new Date().toISOString() + ' ' + message + '\\n');
const runQuiet = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'ignore', shell: process.platform === 'win32' });
  log(command + ' ' + args.join(' ') + ' -> status=' + result.status + ' error=' + (result.error?.message || 'none'));
  return result;
};

function quitVsCode() {
  if (process.platform === 'darwin') {
    // AppleScript закрывает application bundle заметно и надёжнее, чем VS Code CLI command из integrated terminal.
    runQuiet('osascript', ['-e', 'tell application "Visual Studio Code" to quit']);
    runQuiet('osascript', ['-e', 'tell application id "com.microsoft.VSCode" to quit']);
    return;
  }

  if (process.platform === 'win32') {
    runQuiet('taskkill', ['/IM', 'Code.exe', '/T']);
    return;
  }

  runQuiet(codeCommand, ['--command', 'workbench.action.quit']);
}

function openVsCode() {
  if (process.platform === 'darwin') {
    const opened = runQuiet('open', ['-a', 'Visual Studio Code', workspacePath]);
    if (opened.status === 0) return;
  }

  const relaunched = spawn(codeCommand, [workspacePath], {
    detached: true,
    stdio: 'ignore',
    shell: process.platform === 'win32'
  });
  log('spawn ' + codeCommand + ' ' + workspacePath + ' -> pid=' + relaunched.pid);
  relaunched.unref();
}

log('restart helper started for workspace=' + workspacePath);
// Небольшая пауза даёт родительскому npm-скрипту вывести финальный лог перед закрытием окна VS Code.
sleep(800);
quitVsCode();
// VS Code закрывает окна асинхронно; задержка снижает шанс открыть workspace в ещё не завершившемся процессе.
sleep(Math.max(500, restartDelayMs));
openVsCode();
log('restart helper finished');
`;

  console.log(`Fully restarting VS Code with ${codeCommand}...`);
  console.log(`Restart helper log: ${path.relative(rootDir, restartLogPath)}`);
  const helper = spawn(process.execPath, ['-e', helperScript, codeCommand, rootDir, String(restartDelayMs), restartLogPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  helper.unref();
}

mkdirSync(outDir, { recursive: true });

console.log('Building extension...');
run('npm', ['run', 'build']);

console.log(`Packaging ${path.relative(rootDir, vsixPath)}...`);
run('npx', [
  'vsce',
  'package',
  '--no-dependencies',
  '--allow-missing-repository',
  '--skip-license',
  '--out',
  vsixPath
]);

if (!existsSync(vsixPath)) {
  throw new Error(`VSIX was not created: ${vsixPath}`);
}

if (skipInstall) {
  console.log('Skipping installation because --no-install was passed.');
  process.exit(0);
}

console.log(`Installing with ${codeCommand}...`);
run(codeCommand, ['--install-extension', vsixPath, '--force']);
restartVsCodeFully();

console.log('Done. Full VS Code restart was requested to activate the installed extension.');
