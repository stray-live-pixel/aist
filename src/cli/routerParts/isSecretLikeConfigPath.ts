export function isSecretLikeConfigPath(key: string): boolean {
  if (!key) {
    return false;
  }

  return /(^|[._-])(api[_-]?key|apikey|token|secret|password|oauth)($|[._-])/i.test(key);
}
