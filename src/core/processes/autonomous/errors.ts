export class AutonomousError extends Error {
  constructor(
    message: string,
    readonly code: string
  ) {
    super(message);
    this.name = 'AutonomousError';
  }
}

/**
 * Что это: ошибка доступа к workspace storage autonomous runner.
 * Почему отдельный тип: отсутствие workspace — ожидаемая пользовательская
 * ситуация, и её нужно показывать в autonomous UI без попыток писать в
 * globalStorage или существующий chat store.
 */
export class AutonomousStorageError extends AutonomousError {
  constructor(message: string, code = 'autonomous.storage') {
    super(message, code);
    this.name = 'AutonomousStorageError';
  }
}
