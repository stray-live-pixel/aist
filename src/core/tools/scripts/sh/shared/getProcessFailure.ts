/**
 * Формирует структурированную часть результата для неуспешного Bash-процесса.
 *
 * Если команда прошла успешно — ничего не добавляем. При таймауте возвращаем
 * код TIMEOUT, а при ненулевом exit code — прежний INVALID_ARGUMENT с понятным
 * текстом для пользователя и модели.
 */
export function getProcessFailure({
  ok,
  timedOut,
  timeoutError,
  exitCode,
  signal
}: {
  ok: boolean;
  timedOut: boolean;
  timeoutError: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}): Record<string, unknown> {
  if (ok) {
    return {};
  }

  if (timedOut) {
    return {
      code: 'TIMEOUT',
      error: timeoutError
    };
  }

  return {
    code: 'INVALID_ARGUMENT',
    error:
      exitCode === null
        ? `Bash script exited without an exit code${signal ? ` after signal ${signal}` : ''}.`
        : `Bash script exited with code ${exitCode}.`
  };
}
