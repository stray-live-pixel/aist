import { readFile, rename, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';

const WEBVIEW_CSS_PATH = 'dist/webview.css';
const MODULES_CSS_PATH = 'dist/webview.modules.css';

if (process.argv[2] === 'merge-css') {
  await mergeWebviewCss();
} else {
  await buildWebview();
}

async function buildWebview() {
  await build({
    entryPoints: ['src/webview/app/index.tsx'],
    bundle: true,
    format: 'iife',
    minify: true,
    define: {
      'process.env.NODE_ENV': '"production"'
    },
    outfile: 'dist/webview.js',
    plugins: [
      sassPlugin({
        filter: /\.module\.scss$/,
        type: 'local-css'
      })
    ]
  });

  await rename(WEBVIEW_CSS_PATH, MODULES_CSS_PATH);
}

/**
 * Объединяет CSS Modules с глобальным Tailwind CSS.
 *
 * Использование: npm script сначала запускает сборку webview, затем Tailwind CLI,
 * затем повторно запускает этот файл с аргументом `merge-css`.
 * Esbuild пишет CSS modules в `dist/webview.css`, а Tailwind CLI пишет туда же
 * глобальные стили. Без merge второй шаг перетирает CSS modules.
 */
async function mergeWebviewCss() {
  const [modulesCss, globalCss] = await Promise.all([readFile(MODULES_CSS_PATH, 'utf8'), readFile(WEBVIEW_CSS_PATH, 'utf8')]);

  await writeFile(WEBVIEW_CSS_PATH, `${globalCss}\n${modulesCss}`);
}
