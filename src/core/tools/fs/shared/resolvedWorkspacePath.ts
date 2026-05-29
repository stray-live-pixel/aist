/**
 * Безопасно разрешённый путь внутри workspace.
 *
 * absolutePath нужен Node.js для реальной работы с файлом, а relativePath нужен
 * продуктовым ответам инструмента, чтобы не раскрывать лишние абсолютные пути.
 */
export type ResolvedWorkspacePath = {
  absolutePath: string;
  relativePath: string;
};
