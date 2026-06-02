import type { CliCommand, CliWriter, RunCliOptions } from '../router';

/**
 * Что это: зависимости выполнения CLI-команд.
 * Зачем нужно: router передаёт сюда конкретные сценарии chat/config/auth/models/autonomous.
 * Какую проблему решает: верхний CLI-router больше не содержит длинную цепочку бизнес-операций.
 */
export type CliCommandRunnerHandlers = {
  help(): string;
  version(): string;
  paths(command: Extract<CliCommand, { kind: 'paths' }>): string;
  doctor(
    command: Extract<CliCommand, { kind: 'doctor' }>,
    stderr: CliWriter
  ): Promise<{ exitCode: number; output: string }>;
  daemon(command: Extract<CliCommand, { kind: 'daemon' }>, stderr: CliWriter): Promise<number>;
  chat(command: Extract<CliCommand, { kind: `chat${string}` }>, stdout: CliWriter, stderr: CliWriter): Promise<number>;
  config(command: Extract<CliCommand, { kind: `config${string}` }>, stdout: CliWriter): Promise<number>;
  auth(command: Extract<CliCommand, { kind: `auth${string}` }>, stdout: CliWriter, stderr: CliWriter): Promise<number>;
  models(command: Extract<CliCommand, { kind: `models${string}` }>, stdout: CliWriter): Promise<number>;
  autonomous(command: Extract<CliCommand, { kind: `autonomous${string}` }>, stdout: CliWriter): Promise<number>;
};

/**
 * Что это: фабрика верхнего исполнителя CLI-команд.
 * Зачем нужно: parse остаётся в router, а выполнение команд разнесено по продуктовым сценариям.
 * Какую проблему решает: добавление новой CLI-команды больше не требует править монолитный runCli.
 */
export function createCliCommandRunner({ handlers }: { handlers: CliCommandRunnerHandlers }) {
  /**
   * Что это: выполняет уже распарсенную CLI-команду.
   * Зачем нужно: единая точка dispatch сохраняет порядок и exit codes старого router.
   * Какую проблему решает: command-файлы можно развивать независимо от парсера аргументов.
   */
  return async function runParsedCliCommand({
    command,
    options,
    stdout,
    stderr
  }: {
    command: CliCommand;
    options: RunCliOptions;
    stdout: CliWriter;
    stderr: CliWriter;
  }): Promise<number> {
    void options;

    switch (command.kind) {
      case 'help':
        stdout(handlers.help());
        return 0;
      case 'version':
        stdout(`${handlers.version()}\n`);
        return 0;
      case 'paths':
        stdout(handlers.paths(command));
        return 0;
      case 'doctor': {
        const result = await handlers.doctor(command, stderr);
        stdout(result.output);
        return result.exitCode;
      }
      case 'daemon':
        return handlers.daemon(command, stderr);
      case 'chatNew':
      case 'chatList':
      case 'chatGet':
      case 'chatClear':
      case 'chatSetModel':
      case 'chatAsk':
        return handlers.chat(command, stdout, stderr);
      case 'configGet':
      case 'configSet':
        return handlers.config(command, stdout);
      case 'authOpenRouterSetKey':
      case 'authOpenRouterStatus':
      case 'authCodexStatus':
        return handlers.auth(command, stdout, stderr);
      case 'modelsList':
      case 'modelsRefresh':
        return handlers.models(command, stdout);
      case 'autonomousList':
      case 'autonomousFlowStart':
      case 'autonomousRunStart':
      case 'autonomousStop':
      case 'autonomousExport':
        return handlers.autonomous(command, stdout);
      default:
        return 0;
    }
  };
}
