export const SECRET_PATTERNS = [
  /\b(api[_-]?key|access[_-]?token|auth[_-]?token|password|secret)\b\s*[:=]/i,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
  /\b(sk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_=-]{12,}/i,
  /\b[A-Za-z0-9+/]{32,}={0,2}\b/
];
