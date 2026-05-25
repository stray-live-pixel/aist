import { build } from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';

await buildWebview();

/**
 * Собирает webview без Tailwind: глобальный `styles.css` импортируется из entry,
 * а `*.module.scss` обрабатываются esbuild-sass-plugin как local-css.
 * Это важно для полного отказа от Tailwind CLI и одного источника итогового CSS.
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
        type: 'local-css'
      })
    ],
    loader: {
      '.css': 'css'
    }
  });
}
