import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearRepoMapCache, getRepoMap, getRepoVerificationContextNote } from './repoMap';

let tempRoot: string;

describe('repoMap', () => {
  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aist-repo-map-'));
    clearRepoMapCache();
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    clearRepoMapCache();
  });

  it('extracts npm package scripts and verification hints', () => {
    fs.mkdirSync(path.join(tempRoot, 'src'));
    fs.mkdirSync(path.join(tempRoot, 'tests'));
    fs.writeFileSync(
      path.join(tempRoot, 'package.json'),
      JSON.stringify(
        {
          name: 'sample-app',
          scripts: {
            test: 'vitest run',
            typecheck: 'tsc --noEmit',
            build: 'vite build',
            dev: 'vite dev'
          }
        },
        null,
        2
      )
    );
    fs.writeFileSync(path.join(tempRoot, 'package-lock.json'), '{}');
    fs.writeFileSync(path.join(tempRoot, 'tsconfig.json'), '{}');
    fs.writeFileSync(path.join(tempRoot, 'vitest.config.ts'), 'export default {};');

    const repoMap = getRepoMap(tempRoot);

    expect(repoMap.packageManager).toBe('npm');
    expect(repoMap.packageName).toBe('sample-app');
    expect(repoMap.scripts).toEqual(['build', 'dev', 'test', 'typecheck']);
    expect(repoMap.configFiles).toEqual(['package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts']);
    expect(repoMap.topLevelDirs).toEqual(['src', 'tests']);
    expect(repoMap.verificationHints).toEqual(['npm run typecheck', 'npm run test', 'npm run build']);
    expect(repoMap.excerpt).toContain('Verification hints: npm run typecheck, npm run test, npm run build');
  });

  it('does not require package.json', () => {
    fs.mkdirSync(path.join(tempRoot, 'src'));
    fs.writeFileSync(path.join(tempRoot, 'tsconfig.json'), '{}');

    const repoMap = getRepoMap(tempRoot);

    expect(repoMap.packageManager).toBeNull();
    expect(repoMap.packageName).toBeNull();
    expect(repoMap.scripts).toEqual([]);
    expect(repoMap.configFiles).toEqual(['tsconfig.json']);
    expect(repoMap.topLevelDirs).toEqual(['src']);
    expect(repoMap.verificationHints).toEqual([]);
    expect(repoMap.excerpt).toContain('no package.json/package manager detected');
  });

  it('invalidates cached data when package metadata changes', () => {
    const packageJsonPath = path.join(tempRoot, 'package.json');
    fs.writeFileSync(packageJsonPath, JSON.stringify({ scripts: { test: 'vitest run' } }));

    const firstRepoMap = getRepoMap(tempRoot);
    fs.writeFileSync(packageJsonPath, JSON.stringify({ scripts: { test: 'vitest run', typecheck: 'tsc' } }));
    const secondRepoMap = getRepoMap(tempRoot);

    expect(firstRepoMap.scripts).toEqual(['test']);
    expect(secondRepoMap.scripts).toEqual(['test', 'typecheck']);
    expect(secondRepoMap.verificationHints).toEqual(['npm run typecheck', 'npm run test']);
  });

  it('returns verification context notes only for implementation-like prompts', () => {
    fs.writeFileSync(
      path.join(tempRoot, 'package.json'),
      JSON.stringify({ scripts: { test: 'vitest run', typecheck: 'tsc --noEmit' } })
    );

    expect(getRepoVerificationContextNote(tempRoot, 'Implement the issue')).toBe(
      'Verification hints from package scripts: npm run typecheck; npm run test.'
    );
    expect(getRepoVerificationContextNote(tempRoot, 'What does this repository do?')).toBe('');
  });
});
