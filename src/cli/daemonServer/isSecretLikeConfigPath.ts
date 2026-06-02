/**
 * Что это: проверяет, похож ли путь настройки на секрет.
 * Зачем нужно: config responses и logs должны маскировать api keys, tokens, passwords и OAuth values.
 * Какую продуктовую проблему решает: секреты не раскрываются через daemon diagnostics и UI.
 */
export function isSecretLikeConfigPath({ key }: { key: string }): boolean {
  return key
    .split('.')
    .some((segment) => ['apikey', 'api_key', 'token', 'secret', 'password', 'oauth'].includes(segment.toLowerCase()));
}
