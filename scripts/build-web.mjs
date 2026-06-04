import fs from 'node:fs/promises';
import path from 'node:path';

import { build } from 'esbuild';

const outdir = 'dist/ui/web';

await fs.mkdir(outdir, { recursive: true });

await build({
  entryPoints: ['src/ui/web/index.tsx'],
  bundle: true,
  format: 'iife',
  minify: true,
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  outfile: path.join(outdir, 'app.js'),
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
  <title>AIST web</title>
  <link rel="stylesheet" href="/app.css">
</head>
<body>
  <div id="root"></div>
  <script src="/app.js"></script>
</body>
</html>
`
);
