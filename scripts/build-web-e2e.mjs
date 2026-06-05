import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { basename } from 'node:path';
import path from 'node:path';

import { build } from 'esbuild';
import { postcssModules, sassPlugin } from 'esbuild-sass-plugin';

// Собирает mock-вариант web shell (общий UI на in-memory AgentHost) для web e2e на моках.
const outdir = 'dist/ui/web-e2e';

await fs.mkdir(outdir, { recursive: true });

await build({
  entryPoints: ['src/ui/web/e2e/mountMockWebUi.tsx'],
  bundle: true,
  format: 'iife',
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  outfile: path.join(outdir, 'app.js'),
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

await fs.writeFile(
  path.join(outdir, 'index.html'),
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AIST web e2e</title>
  <link rel="stylesheet" href="/app.css">
</head>
<body>
  <div id="root"></div>
  <script src="/app.js"></script>
</body>
</html>
`
);

function createScopedClassName(localClassName, filePath) {
  const componentName = basename(filePath).replace(/\.module\.(s[ac]ss|css)$/u, '');
  const hash = createHash('sha256')
    .update(`${filePath}:${localClassName}`)
    .digest('base64url')
    .replace(/[^A-Za-z0-9]/gu, '')
    .slice(0, 6);

  return `${componentName}_${localClassName}_${hash}`;
}
