import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export type RepoMap = {
  workspacePath: string;
  packageManager: PackageManager | null;
  packageName: string | null;
  scripts: string[];
  configFiles: string[];
  topLevelDirs: string[];
  verificationHints: string[];
  excerpt: string;
};

type RepoMapCacheEntry = {
  fingerprint: string;
  repoMap: RepoMap;
};

const CONFIG_FILE_CANDIDATES = [
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'jsconfig.json',
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mts',
  'vite.config.mjs',
  'vitest.config.ts',
  'vitest.config.js',
  'vitest.config.mts',
  'vitest.config.mjs',
  'jest.config.ts',
  'jest.config.js',
  'jest.config.mjs',
  'jest.config.cjs',
  'eslint.config.ts',
  'eslint.config.js',
  'eslint.config.mjs',
  '.eslintrc',
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc.cjs',
  'prettier.config.ts',
  'prettier.config.js',
  'prettier.config.mjs',
  'prettier.config.cjs',
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.yaml',
  '.prettierrc.yml',
  'webpack.config.ts',
  'webpack.config.js',
  'rollup.config.ts',
  'rollup.config.js',
  'rollup.config.mjs',
  'next.config.ts',
  'next.config.js',
  'next.config.mjs',
  'svelte.config.js',
  'astro.config.ts',
  'astro.config.mjs',
  'tailwind.config.ts',
  'tailwind.config.js',
  'playwright.config.ts',
  'playwright.config.js',
  '.storybook/main.ts',
  '.storybook/main.js'
] as const;

const CACHE_DIGEST_LIMIT_BYTES = 256 * 1024;
const MAX_EXCERPT_ITEMS = 12;
const VERIFICATION_PROMPT_PATTERN = new RegExp(
  [
    '\\b(add|build|change|compile|edit|error|failing|feature|fix|implement|issue|lint|modify|optimi[sz]e|refactor|task|test|update|verify)\\b',
    '\\u0434\\u043e\\u0431\\u0430\\u0432',
    '\\u0437\\u0430\\u0434\\u0430\\u0447',
    '\\u0438\\u0437\\u043c\\u0435\\u043d\\u0438',
    '\\u0438\\u0441\\u043f\\u0440\\u0430\\u0432',
    '\\u043e\\u0448\\u0438\\u0431',
    '\\u043e\\u043f\\u0442\\u0438\\u043c\\u0438\\u0437\\u0430\\u0446',
    '\\u043f\\u0440\\u043e\\u0432\\u0435\\u0440',
    '\\u0440\\u0435\\u0430\\u043b\\u0438\\u0437',
    '\\u0441\\u0431\\u043e\\u0440',
    '\\u0442\\u0435\\u0441\\u0442'
  ].join('|'),
  'i'
);
const repoMapCache = new Map<string, RepoMapCacheEntry>();

export function getRepoMap(workspacePath: string): RepoMap {
  const normalizedWorkspacePath = path.resolve(workspacePath);
  const fingerprint = computeRepoMapFingerprint(normalizedWorkspacePath);
  const cached = repoMapCache.get(normalizedWorkspacePath);

  if (cached?.fingerprint === fingerprint) {
    return cached.repoMap;
  }

  const repoMap = buildRepoMap(normalizedWorkspacePath);
  repoMapCache.set(normalizedWorkspacePath, { fingerprint, repoMap });
  return repoMap;
}

export function clearRepoMapCache(): void {
  repoMapCache.clear();
}

export function getRepoVerificationContextNote(workspacePath: string, prompt: string): string {
  if (!shouldIncludeVerificationHints(prompt)) {
    return '';
  }

  const verificationHints = getRepoMap(workspacePath).verificationHints;
  if (!verificationHints.length) {
    return '';
  }

  return `Verification hints from package scripts: ${verificationHints.join('; ')}.`;
}

function buildRepoMap(workspacePath: string): RepoMap {
  const packageJson = readPackageJson(workspacePath);
  const configFiles = getExistingConfigFiles(workspacePath);
  const packageManager = detectPackageManager(workspacePath, packageJson);
  const scripts = getPackageScripts(packageJson);
  const verificationHints = getVerificationHints(packageManager, scripts);
  const topLevelDirs = getTopLevelDirs(workspacePath);
  const packageName = typeof packageJson?.name === 'string' ? packageJson.name : null;

  const repoMap = {
    workspacePath,
    packageManager,
    packageName,
    scripts,
    configFiles,
    topLevelDirs,
    verificationHints,
    excerpt: ''
  };

  return {
    ...repoMap,
    excerpt: formatRepoMapExcerpt(repoMap)
  };
}

function computeRepoMapFingerprint(workspacePath: string): string {
  const entries = ['root', statFingerprint(workspacePath, false)];

  for (const relativePath of CONFIG_FILE_CANDIDATES) {
    entries.push(relativePath, statFingerprint(path.join(workspacePath, relativePath), true));
  }

  return entries.join('|');
}

function statFingerprint(filePath: string, includeDigest: boolean): string {
  try {
    const stat = fs.statSync(filePath);
    const base = `${stat.isDirectory() ? 'd' : 'f'}:${stat.size}:${Math.trunc(stat.mtimeMs)}`;

    if (!includeDigest || !stat.isFile() || stat.size > CACHE_DIGEST_LIMIT_BYTES) {
      return base;
    }

    return `${base}:${createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')}`;
  } catch {
    return 'missing';
  }
}

function readPackageJson(workspacePath: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(fs.readFileSync(path.join(workspacePath, 'package.json'), 'utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function getExistingConfigFiles(workspacePath: string): string[] {
  return CONFIG_FILE_CANDIDATES.filter((relativePath) => {
    try {
      return fs.statSync(path.join(workspacePath, relativePath)).isFile();
    } catch {
      return false;
    }
  });
}

function detectPackageManager(
  workspacePath: string,
  packageJson: Record<string, unknown> | undefined
): PackageManager | null {
  const packageManager = typeof packageJson?.packageManager === 'string' ? packageJson.packageManager : '';

  if (packageManager.startsWith('pnpm@')) return 'pnpm';
  if (packageManager.startsWith('yarn@')) return 'yarn';
  if (packageManager.startsWith('bun@')) return 'bun';
  if (packageManager.startsWith('npm@')) return 'npm';

  if (exists(workspacePath, 'pnpm-lock.yaml')) return 'pnpm';
  if (exists(workspacePath, 'yarn.lock')) return 'yarn';
  if (exists(workspacePath, 'bun.lock') || exists(workspacePath, 'bun.lockb')) return 'bun';
  if (exists(workspacePath, 'package-lock.json') || packageJson) return 'npm';

  return null;
}

function getPackageScripts(packageJson: Record<string, unknown> | undefined): string[] {
  const scripts = packageJson?.scripts;
  if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts)) {
    return [];
  }

  return Object.keys(scripts).sort((left, right) => left.localeCompare(right));
}

function getVerificationHints(packageManager: PackageManager | null, scripts: string[]): string[] {
  if (!packageManager || !scripts.length) {
    return [];
  }

  const preferredScripts = [
    'typecheck',
    'test',
    'compile',
    'build',
    'lint',
    'test:unit',
    'test:watch',
    'test:e2e',
    'package'
  ];

  return preferredScripts
    .filter((script) => scripts.includes(script))
    .slice(0, 5)
    .map((script) => `${packageManager} run ${script}`);
}

function getTopLevelDirs(workspacePath: string): string[] {
  try {
    return fs
      .readdirSync(workspacePath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter(isUsefulTopLevelDir)
      .sort((left, right) => left.localeCompare(right))
      .slice(0, MAX_EXCERPT_ITEMS);
  } catch {
    return [];
  }
}

function isUsefulTopLevelDir(name: string): boolean {
  if (['.git', '.vscode-test', 'node_modules', 'dist', 'out', 'build', 'coverage', 'storybook-static'].includes(name)) {
    return false;
  }

  return !name.startsWith('.') || ['.github', '.storybook', '.vscode'].includes(name);
}

function formatRepoMapExcerpt(repoMap: Omit<RepoMap, 'excerpt'>): string {
  const lines = ['Repo map:'];
  const packageLabel = repoMap.packageManager
    ? `${repoMap.packageManager}${repoMap.packageName ? ` package "${repoMap.packageName}"` : ' package'}`
    : 'no package.json/package manager detected';

  lines.push(`- Package: ${packageLabel}`);
  lines.push(`- Scripts: ${formatList(repoMap.scripts)}`);
  lines.push(`- Config files: ${formatList(repoMap.configFiles)}`);
  lines.push(`- Top-level dirs: ${formatList(repoMap.topLevelDirs)}`);
  lines.push(`- Verification hints: ${formatList(repoMap.verificationHints)}`);

  return lines.join('\n');
}

function formatList(values: string[]): string {
  if (!values.length) {
    return 'none detected';
  }

  const visible = values.slice(0, MAX_EXCERPT_ITEMS);
  const suffix = values.length > visible.length ? `, +${values.length - visible.length} more` : '';
  return `${visible.join(', ')}${suffix}`;
}

function exists(workspacePath: string, relativePath: string): boolean {
  return fs.existsSync(path.join(workspacePath, relativePath));
}

function shouldIncludeVerificationHints(prompt: string): boolean {
  return VERIFICATION_PROMPT_PATTERN.test(prompt);
}
