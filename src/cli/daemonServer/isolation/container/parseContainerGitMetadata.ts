/**
 * Что это: достаёт git-метаданные из stdout bootstrap/finalize команд контейнера.
 * Зачем нужно: Docker exec возвращает обычный текст, а daemon хранит typed state для UI и reconnect.
 * Какую продуктовую проблему решает: локальный UI видит SHA/remote/PR даже когда работа идёт внутри автономного контейнера.
 */
export function parseContainerGitMetadata({ stdout }: { stdout: string }): Record<string, string> {
  const metadata: Record<string, string> = {};
  for (const line of stdout.split('\n')) {
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) {
      metadata[key] = value;
    }
  }
  return metadata;
}
