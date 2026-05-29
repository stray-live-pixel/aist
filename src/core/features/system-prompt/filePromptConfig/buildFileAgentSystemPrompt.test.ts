import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { globalSettingsFile, workspaceSettingsFile } from '../../../entities/storage/storage';
import { buildFileAgentSystemPrompt, getFileAgentInstructionSources, getFilePromptConfig } from './index';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('filePromptConfig system prompt builder', () => {
  it('adds active preset instructions, active mode and declarative project files to the final prompt', () => {
    const workspaceRoot = createTempDir({ prefix: 'aist-file-prompt-workspace-' });
    const homeDir = createTempDir({ prefix: 'aist-file-prompt-home-' });

    writeJsonFile({
      filePath: globalSettingsFile(homeDir),
      value: {
        instructions: [{ id: 'quality', label: 'Quality rules', content: 'Write code that is easy to review.' }],
        modes: [{ id: 'coder', label: 'Coder', instructions: 'Act as a careful coding agent.' }],
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
        instructions: [
          { id: 'tests', label: 'Project tests', content: 'Run focused unit tests for changed behavior.' }
        ],
        activeInstructionRefs: [
          { scope: 'global', id: 'quality' },
          { scope: 'local', id: 'tests' }
        ],
        activeModeRef: { scope: 'global', id: 'coder' },
        activePresetId: 'coding'
      }
    });
    writeTextFile({
      filePath: path.join(workspaceRoot, '.aist-agent', 'instructions', 'project.md'),
      content: 'Follow repository prompt policy.'
    });

    const prompt = buildFileAgentSystemPrompt({ workspaceRoot, homeDir, language: 'en' });

    expect(prompt).toContain('## Global instruction: Quality rules');
    expect(prompt).toContain('Write code that is easy to review.');
    expect(prompt).toContain('## Project instruction: Project tests');
    expect(prompt).toContain('Run focused unit tests for changed behavior.');
    expect(prompt).toContain('## Global mode: Coder');
    expect(prompt).toContain('Act as a careful coding agent.');
    expect(prompt).toContain('Source: .aist-agent/instructions/project.md');
    expect(prompt).toContain('Follow repository prompt policy.');
  });

  it('uses the first available preset as fallback when workspace has no explicit active refs', () => {
    const workspaceRoot = createTempDir({ prefix: 'aist-file-prompt-workspace-' });
    const homeDir = createTempDir({ prefix: 'aist-file-prompt-home-' });

    writeJsonFile({
      filePath: globalSettingsFile(homeDir),
      value: {
        instructions: [{ id: 'safe', label: 'Safe changes', content: 'Keep changes small.' }],
        modes: [{ id: 'architect', label: 'Architect', instructions: 'Explain trade-offs.' }],
        presets: [
          {
            id: 'design',
            label: 'Design',
            instructionRefs: [{ scope: 'global', id: 'safe' }],
            modeRef: { scope: 'global', id: 'architect' },
            scope: 'global'
          }
        ]
      }
    });

    const config = getFilePromptConfig({ workspaceRoot, homeDir });
    const sources = getFileAgentInstructionSources({ workspaceRoot, homeDir });

    expect(config.activePresetId).toBe('design');
    expect(config.activeInstructionRefs).toEqual([{ scope: 'global', id: 'safe' }]);
    expect(config.activeModeRef).toEqual({ scope: 'global', id: 'architect' });
    expect(sources.map((source) => source.id)).toContain('global:instruction:safe');
    expect(sources.map((source) => source.id)).toContain('global:mode:architect');
  });
});

/**
 * Что это: создаёт временную директорию для тестового workspace или home.
 * Зачем нужно: тесты проверяют реальное файловое поведение без влияния на настройки разработчика.
 */
function createTempDir(params: { prefix: string }): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), params.prefix));
  tempDirs.push(dir);
  return dir;
}

/**
 * Что это: записывает JSON fixture в нужный settings.json.
 * Зачем нужно: тест читает те же файлы, что daemon использует перед отправкой запроса модели.
 */
function writeJsonFile(params: { filePath: string; value: unknown }): void {
  fs.mkdirSync(path.dirname(params.filePath), { recursive: true });
  fs.writeFileSync(params.filePath, `${JSON.stringify(params.value, null, 2)}\n`, 'utf8');
}

/**
 * Что это: записывает текстовый fixture для declarative или legacy instruction-файла.
 * Зачем нужно: тест проверяет не только settings.json, но и реальные проектные prompt-файлы.
 */
function writeTextFile(params: { filePath: string; content: string }): void {
  fs.mkdirSync(path.dirname(params.filePath), { recursive: true });
  fs.writeFileSync(params.filePath, params.content, 'utf8');
}
