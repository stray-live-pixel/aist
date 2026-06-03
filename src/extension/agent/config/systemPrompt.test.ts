import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { globalSettingsFile, workspaceSettingsFile } from '../../../core/entities/storage/storage';
import { buildAgentSystemPrompt, getAgentInstructionSources } from './systemPrompt';

const tempDirs: string[] = [];

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [],
    getConfiguration: () => ({
      get: () => true
    })
  },
  Uri: {
    file: (filePath: string) => ({ fsPath: filePath })
  }
}));

vi.mock('./settings', () => ({
  getAgentLanguage: () => 'en'
}));

vi.mock('../../skills/skills', () => ({
  getAgentSkills: () => []
}));

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('extension system prompt preview', () => {
  it('uses the shared file prompt builder for active preset instructions and mode', () => {
    const workspaceRoot = createTempDir({ prefix: 'aist-extension-prompt-workspace-' });
    const homeDir = createTempDir({ prefix: 'aist-extension-prompt-home-' });

    writeJsonFile({
      filePath: globalSettingsFile(homeDir),
      value: {
        instructions: [{ id: 'quality', label: 'Quality', content: 'Keep code easy to review.' }],
        modes: [{ id: 'coder', label: 'Coder', instructions: 'Work as a focused coding agent.' }],
        presets: [
          {
            id: 'coding',
            label: 'Coding',
            instructionRefs: [{ scope: 'global', id: 'quality' }],
            modeRef: { scope: 'global', id: 'coder' },
            scope: 'global'
          }
        ]
      }
    });
    writeJsonFile({
      filePath: workspaceSettingsFile(workspaceRoot),
      value: {
        instructions: [{ id: 'tests', label: 'Tests', content: 'Run focused prompt tests.' }],
        activeInstructionRefs: [
          { scope: 'global', id: 'quality' },
          { scope: 'local', id: 'tests' }
        ],
        activeModeRef: { scope: 'global', id: 'coder' },
        activePresetId: 'coding'
      }
    });

    const prompt = buildAgentSystemPrompt({ workspaceRoot, homeDir });

    expect(prompt).toContain('## Global instruction: Quality');
    expect(prompt).toContain('Keep code easy to review.');
    expect(prompt).toContain('## Project instruction: Tests');
    expect(prompt).toContain('Run focused prompt tests.');
    expect(prompt).toContain('## Global mode: Coder');
    expect(prompt).toContain('Work as a focused coding agent.');
  });

  it('orders declarative sources after the base source and before legacy instruction files', () => {
    const workspaceRoot = createTempDir({ prefix: 'aist-extension-prompt-workspace-' });
    const homeDir = createTempDir({ prefix: 'aist-extension-prompt-home-' });
    writeTextFile({
      filePath: path.join(workspaceRoot, 'AGENTS.md'),
      content: 'Legacy agents.'
    });
    writeTextFile({
      filePath: path.join(workspaceRoot, '.aist-agent', 'instructions', 'project.md'),
      content: 'Declarative instructions.'
    });

    expect(getAgentInstructionSources({ workspaceRoot, homeDir }).map((source) => source.id)).toEqual([
      'base',
      '.aist-agent/instructions/project.md',
      'AGENTS.md'
    ]);
  });
});

/**
 * Что это: создаёт временную директорию для тестового workspace или home.
 * Зачем нужно: preview-тесты читают реальные файлы, не трогая настройки разработчика.
 */
function createTempDir(params: { prefix: string }): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), params.prefix));
  tempDirs.push(dir);
  return dir;
}

/**
 * Что это: записывает JSON fixture настроек агента.
 * Зачем нужно: тест проверяет тот же файловый контракт, который использует daemon.
 */
function writeJsonFile(params: { filePath: string; value: unknown }): void {
  fs.mkdirSync(path.dirname(params.filePath), { recursive: true });
  fs.writeFileSync(params.filePath, `${JSON.stringify(params.value, null, 2)}\n`, 'utf8');
}

/**
 * Что это: записывает текстовый fixture проектных инструкций.
 * Зачем нужно: тест проверяет порядок declarative и legacy источников в preview.
 */
function writeTextFile(params: { filePath: string; content: string }): void {
  fs.mkdirSync(path.dirname(params.filePath), { recursive: true });
  fs.writeFileSync(params.filePath, params.content, 'utf8');
}
