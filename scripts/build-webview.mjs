import { createHash } from 'node:crypto';
import { basename } from 'node:path';

import { build } from 'esbuild';
import { postcssModules, sassPlugin } from 'esbuild-sass-plugin';

await buildWebview();

/**
 * Собирает webview без Tailwind: глобальный `styles.css` импортируется из entry,
 * а `*.module.scss` проходят через стандартный postcss-modules.
 *
 * Почему не `type: local-css`: встроенные CSS modules esbuild не дают задать шаблон
 * scoped-класса. `postcss-modules` поддерживает `generateScopedName`, поэтому здесь
 * получаем production-имя вида `Component_localClass_hash` без постобработки JS-бандла.
 */
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
        type: 'css',
        transform: postcssModules({
          generateScopedName: createScopedClassName
        })
      })
    ],
    loader: {
      '.css': 'css'
    }
  });
}

/**
 * Формирует имя CSS module класса в формате `Component_localClass_hash`.
 *
 * Компонент берём из имени файла до `.module.scss`: это совпадает с текущей
 * конвенцией проекта (`MessageList.module.scss`, `Card.module.scss`). Hash строим
 * по пути файла и local-классу, чтобы одинаковые `.root` в разных компонентах не
 * конфликтовали, но оставались стабильными между сборками.
 */
function createScopedClassName(localClassName, filePath) {
  const componentName = basename(filePath).replace(/\.module\.(s[ac]ss|css)$/u, '');
  const hash = createStableHash(`${filePath}:${localClassName}`);

  return `${componentName}_${localClassName}_${hash}`;
}

/**
 * Создаёт короткий стабильный hash для CSS module класса.
 *
 * Оставляем только буквы и цифры, чтобы hash не начинался с визуально шумного `-` или `_`.
 */
function createStableHash(value) {
  return createHash('sha256').update(value).digest('base64url').replace(/[^A-Za-z0-9]/gu, '').slice(0, 6);
}
