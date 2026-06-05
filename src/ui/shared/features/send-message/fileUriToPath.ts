/**
 * Что это: преобразует file:// URI в локальный путь ОС.
 * Зачем нужно: пользователь ожидает увидеть путь вроде /Users/me/app или C:\\repo\\file.ts, а не percent-encoded URI.
 */
export function fileUriToPath({ uri }: { uri: string }): string | null {
  try {
    const parsedUri = new URL(uri);

    if (parsedUri.protocol !== 'file:') {
      return null;
    }

    const decodedPath = decodeURIComponent(parsedUri.pathname);

    if (/^\/[a-zA-Z]:/.test(decodedPath)) {
      return decodedPath.slice(1);
    }

    return decodedPath;
  } catch {
    return null;
  }
}
