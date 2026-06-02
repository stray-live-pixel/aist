import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_CODE_LINES = 200;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOT = path.join(ROOT, 'src');

/**
 * Что это: pre-commit проверка размера исходных файлов.
 * Зачем нужно: новые сценарии должны попадать в маленькие файлы, которые не страшно менять.
 * Какую проблему решает: предотвращает появление новых orchestration-монолитов больше 200 строк кода.
 */
function main() {
  const files = listSourceFiles({ root: SOURCE_ROOT });
  const violations = files.flatMap((filePath) => getFileSizeViolation({ filePath }));

  if (!violations.length) {
    console.log(`OK: нет файлов больше ${MAX_CODE_LINES} строк кода.`);
    return;
  }

  console.error(`Найдены файлы больше ${MAX_CODE_LINES} строк кода:`);
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  console.error('Разбейте файл на сценарии или утилиты: исключения не допускаются.');
  process.exitCode = 1;
}

/**
 * Что это: рекурсивно собирает TypeScript/TSX исходники проекта.
 * Зачем нужно: проверка должна смотреть только рабочий код, а не dist, storybook-static или релизы.
 * Какую проблему решает: pre-commit остаётся быстрым и не падает на build artifacts.
 */
function listSourceFiles({ root }) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles({ root: entryPath });
    }

    if (entry.isFile() && ['.ts', '.tsx'].includes(path.extname(entry.name))) {
      return [entryPath];
    }

    return [];
  });
}

/**
 * Что это: проверяет один файл относительно лимита и baseline.
 * Зачем нужно: каждый исходный файл должен оставаться маленьким и понятным для дальнейшего развития.
 * Какую проблему решает: правило 200 строк работает без исключений и не даёт вернуть монолиты.
 */
function getFileSizeViolation({ filePath }) {
  const relativePath = toProjectPath({ filePath });
  const codeLines = countCodeLines({ content: fs.readFileSync(filePath, 'utf8') });

  return codeLines > MAX_CODE_LINES ? [`${relativePath}: ${codeLines} строк кода`] : [];
}

/**
 * Что это: считает строки кода без пустых строк и комментариев.
 * Зачем нужно: лимит применяется к смысловому коду, а не к полезным русским комментариям.
 * Какую проблему решает: разработчики могут документировать функции, не боясь искусственно превысить лимит.
 */
function countCodeLines({ content }) {
  let codeLines = 0;
  let insideBlockComment = false;

  for (const rawLine of content.split('\n')) {
    let line = rawLine.trim();
    if (!line) continue;

    if (insideBlockComment) {
      const endIndex = line.indexOf('*/');
      if (endIndex === -1) continue;
      line = line.slice(endIndex + 2).trim();
      insideBlockComment = false;
    }

    while (line.startsWith('/*')) {
      const endIndex = line.indexOf('*/', 2);
      if (endIndex === -1) {
        insideBlockComment = true;
        line = '';
        break;
      }
      line = line.slice(endIndex + 2).trim();
    }

    if (!line || line.startsWith('//')) continue;
    codeLines += 1;
  }

  return codeLines;
}

/**
 * Что это: переводит абсолютный путь в POSIX-путь проекта.
 * Зачем нужно: baseline одинаково работает на macOS, Linux и Windows.
 * Какую проблему решает: pre-commit не зависит от локального разделителя путей.
 */
function toProjectPath({ filePath }) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

main();
