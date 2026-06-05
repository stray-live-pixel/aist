import type { AgentAttachment } from '../../types';

const TEXT_FILE_LIMIT_BYTES = 128 * 1024;

/**
 * Что это: превращает выбранные browser File в вложения агента.
 * Зачем нужно: Composer должен отправлять фактическое содержимое каждого файла, а не только имя в UI-chip.
 * Какую продуктовую проблему решает: пользователь прикрепляет скриншоты, документы и бинарные файлы без ручного копирования содержимого в prompt.
 */
export async function prepareComposerAttachments({ files }: { files: File[] }): Promise<AgentAttachment[]> {
  const prepared = await Promise.all(files.map((file, index) => prepareComposerAttachment({ file, index })));
  return prepared.filter(Boolean);
}

/** Готовит одно вложение и всегда добавляет data URL, чтобы backend получил содержимое файла. */
async function prepareComposerAttachment({ file, index }: { file: File; index: number }): Promise<AgentAttachment> {
  const mimeType = file.type || 'application/octet-stream';
  const kind = mimeType.startsWith('image/') ? 'image' : 'file';
  const baseAttachment = {
    id: `${Date.now()}:${index}:${file.name}`,
    name: file.name || `attachment-${index + 1}`,
    mimeType,
    size: file.size,
    kind,
    dataUrl: await readFileAsDataUrl({ file })
  } satisfies Omit<AgentAttachment, 'text'>;

  if (isReadableTextFile({ file, mimeType })) {
    return { ...baseAttachment, text: await readFileAsText({ file }) };
  }

  return baseAttachment;
}

/** Проверяет, можно ли безопасно дополнительно прочитать файл как текст без риска зависания webview. */
function isReadableTextFile({ file, mimeType }: { file: File; mimeType: string }): boolean {
  if (file.size > TEXT_FILE_LIMIT_BYTES) {
    return false;
  }

  return (
    mimeType.startsWith('text/') || /\.(md|txt|json|csv|log|xml|yaml|yml|ts|tsx|js|jsx|css|scss|html)$/i.test(file.name)
  );
}

/** Читает файл как data URL, который можно передать модели или текстовым fallback-блоком. */
function readFileAsDataUrl({ file }: { file: File }): Promise<string> {
  return readFile({ file, mode: 'dataUrl' });
}

/** Читает файл как текст для анализа обычной моделью. */
function readFileAsText({ file }: { file: File }): Promise<string> {
  return readFile({ file, mode: 'text' });
}

/** Общий wrapper FileReader, чтобы ошибки чтения не превращались в необработанные promise rejection. */
async function readFile({ file, mode }: { file: File; mode: 'dataUrl' | 'text' }): Promise<string> {
  if (typeof FileReader === 'undefined') {
    return mode === 'dataUrl' ? readFileAsDataUrlFallback({ file }) : file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error(`Failed to read ${file.name}`));
    reader.onload = () => resolve(String(reader.result || ''));

    if (mode === 'dataUrl') {
      reader.readAsDataURL(file);
      return;
    }

    reader.readAsText(file);
  });
}

/** Собирает data URL без FileReader для unit-тестов и окружений с modern File API. */
async function readFileAsDataUrlFallback({ file }: { file: File }): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  const base64 = typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return `data:${file.type || 'application/octet-stream'};base64,${base64}`;
}
