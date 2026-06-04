import fs from 'node:fs/promises';
import path from 'node:path';

import { parseMarkdownFrontmatter } from '../../shared/lib/frontmatter';
import { AUTONOMOUS_ROOT_RELATIVE_PATH } from './discovery';
import type { AutonomousStageContext } from './types';

export type EditableAutonomousStageDefinition = {
  file: string;
  title: string;
  body: string;
  model?: string;
  codexModel?: string;
  contexts: AutonomousStageContext[];
  summaryRules?: string;
};

export type EditableAutonomousFlowDefinition = {
  id: string;
  title: string;
  description: string;
  body: string;
  defaultModel?: string;
  defaultCodexModel?: string;
  defaultSummaryRules?: string;
  stages: EditableAutonomousStageDefinition[];
};

export type CreateAutonomousFlowInput = {
  id: string;
  title?: string;
};

export type DeleteAutonomousFlowInput = {
  id: string;
  sourcePath?: string;
};

/**
 * Создаёт минимальный flow с одним стартовым stage.
 *
 * Почему id валидируется строго: id становится именем каталога в workspace, и
 * UI не должен иметь возможность создать путь вне native flows root.
 */
export async function createAutonomousFlowDefinition(
  workspaceRoot: string,
  input: CreateAutonomousFlowInput
): Promise<EditableAutonomousFlowDefinition> {
  const id = normalizeFlowId(input.id);
  const flow: EditableAutonomousFlowDefinition = {
    id,
    title: input.title?.trim() || id,
    description: '',
    body: `# ${input.title?.trim() || id}`,
    stages: [
      {
        file: '1-stage.md',
        title: 'Stage 1',
        body: '# Stage 1\n\nОпишите задачу этапа.',
        contexts: []
      }
    ]
  };
  const flowRoot = getNativeFlowRoot(workspaceRoot, id);
  try {
    await fs.access(flowRoot);
    throw new Error(`Flow already exists: ${id}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Flow already exists')) {
      throw error;
    }
  }
  await saveAutonomousFlowDefinition(workspaceRoot, flow);
  return flow;
}

/**
 * Удаляет native flow directory. Legacy flow удалить нельзя: сначала импортируем в
 * `.aist-agent/autonomous`, потом работаем только с native source of truth.
 */
export async function deleteAutonomousFlowDefinition(
  workspaceRoot: string,
  input: string | DeleteAutonomousFlowInput
): Promise<void> {
  const flowId = typeof input === 'string' ? input : input.id;
  const expectedFlowRoot = getNativeFlowRoot(workspaceRoot, normalizeFlowId(flowId));
  const requestedFlowRoot = typeof input === 'string' ? expectedFlowRoot : normalizeFlowSourcePath(workspaceRoot, input);
  if (requestedFlowRoot !== expectedFlowRoot) {
    throw new Error(`Flow source path does not match native flow id: ${flowId}`);
  }

  await fs.rm(expectedFlowRoot, { recursive: true, force: true });
}

/**
 * Сохраняет flow в native `.aist-agent/autonomous/flows`.
 *
 * Почему отдельный writer: discovery остаётся read-only, controller не знает
 * Markdown/frontmatter формат, а webview не получает права писать в workspace
 * напрямую. Путь строится по flow id и дополнительно проверяется от traversal.
 */
export async function saveAutonomousFlowDefinition(
  workspaceRoot: string,
  flow: EditableAutonomousFlowDefinition
): Promise<void> {
  const flowRoot = getNativeFlowRoot(workspaceRoot, normalizeFlowId(flow.id));
  const previousStageFiles = await readPreviousStageFiles(flowRoot);
  const nextStageFiles = new Set(flow.stages.map((stage) => normalizeStageFile(flowRoot, stage.file)));
  validateUniqueStageFiles(nextStageFiles, flow.stages.length);

  await fs.mkdir(flowRoot, { recursive: true });
  await writeAtomic(
    path.join(flowRoot, '.index.md'),
    serializeMarkdown(
      {
        title: flow.title,
        description: flow.description,
        model: flow.defaultModel,
        codex_model: flow.defaultCodexModel,
        default_summary_rules: flow.defaultSummaryRules,
        stages: flow.stages.map((stage) => stage.file)
      },
      flow.body
    )
  );

  for (const stage of flow.stages) {
    const stageFile = normalizeStageFile(flowRoot, stage.file);
    const stagePath = path.resolve(flowRoot, stageFile);

    await fs.mkdir(path.dirname(stagePath), { recursive: true });
    await writeAtomic(
      stagePath,
      serializeMarkdown(
        {
          title: stage.title,
          model: stage.model,
          codex_model: stage.codexModel,
          contexts: stage.contexts,
          summary_rules: stage.summaryRules
        },
        stage.body
      )
    );
  }

  await removeObsoleteStageFiles({ flowRoot, previousStageFiles, nextStageFiles });
}

function serializeMarkdown(frontmatter: Record<string, unknown>, body: string): string {
  const lines = ['---', ...serializeObject(frontmatter), '---', '', body.trim(), ''];
  return lines.join('\n');
}

function serializeObject(value: Record<string, unknown>): string[] {
  const lines: string[] = [];
  for (const [key, rawValue] of Object.entries(value)) {
    if (rawValue === undefined || rawValue === '' || (Array.isArray(rawValue) && rawValue.length === 0)) {
      continue;
    }

    if (typeof rawValue === 'string') {
      if (rawValue.includes('\n')) {
        lines.push(`${key}: |`);
        lines.push(...rawValue.split('\n').map((line) => `  ${line}`));
      } else {
        lines.push(`${key}: ${rawValue}`);
      }
      continue;
    }

    if (Array.isArray(rawValue)) {
      lines.push(`${key}:`);
      for (const item of rawValue) {
        lines.push(...serializeArrayItem(item));
      }
      continue;
    }

    lines.push(`${key}: ${String(rawValue)}`);
  }
  return lines;
}

function serializeArrayItem(item: unknown): string[] {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return [`  - ${String(item)}`];
  }

  const entries = Object.entries(item as Record<string, unknown>).filter(
    ([, value]) => value !== undefined && value !== ''
  );
  if (!entries.length) {
    return [];
  }

  const [firstKey, firstValue] = entries[0]!;
  const lines = [`  - ${firstKey}: ${String(firstValue)}`];
  for (const [key, value] of entries.slice(1)) {
    if (typeof value === 'string' && value.includes('\n')) {
      lines.push(`    ${key}: |`);
      lines.push(...value.split('\n').map((line) => `      ${line}`));
    } else {
      lines.push(`    ${key}: ${String(value)}`);
    }
  }
  return lines;
}

function getNativeFlowRoot(workspaceRoot: string, flowId: string): string {
  const nativeFlowsRoot = path.resolve(workspaceRoot, AUTONOMOUS_ROOT_RELATIVE_PATH, 'flows');
  const flowRoot = path.resolve(nativeFlowsRoot, flowId);
  if (!isInside(nativeFlowsRoot, flowRoot)) {
    throw new Error(`Flow path escapes native flows root: ${flowId}`);
  }
  return flowRoot;
}

function normalizeFlowSourcePath(workspaceRoot: string, input: DeleteAutonomousFlowInput): string {
  if (!input.sourcePath) {
    return getNativeFlowRoot(workspaceRoot, normalizeFlowId(input.id));
  }

  const nativeFlowsRoot = path.resolve(workspaceRoot, AUTONOMOUS_ROOT_RELATIVE_PATH, 'flows');
  const sourcePath = path.resolve(input.sourcePath);
  if (!isInside(nativeFlowsRoot, sourcePath)) {
    throw new Error(`Only native workflow directories can be deleted: ${input.id}`);
  }
  return sourcePath;
}

async function readPreviousStageFiles(flowRoot: string): Promise<Set<string>> {
  try {
    const parsed = parseMarkdownFrontmatter(await fs.readFile(path.join(flowRoot, '.index.md'), 'utf8'));
    const stages = parsed.attributes.stages;
    if (!Array.isArray(stages)) {
      return new Set();
    }
    return new Set(stages.filter((stage): stage is string => typeof stage === 'string'));
  } catch {
    return new Set();
  }
}

function normalizeStageFile(flowRoot: string, rawFile: string): string {
  const stageFile = rawFile.trim();
  if (!stageFile || path.isAbsolute(stageFile) || stageFile.includes('..')) {
    throw new Error(`Stage file must be a workspace-relative markdown file inside the flow: ${rawFile}`);
  }
  const stagePath = path.resolve(flowRoot, stageFile);
  if (!isInside(flowRoot, stagePath)) {
    throw new Error(`Stage path escapes flow root: ${rawFile}`);
  }
  return stageFile;
}

function validateUniqueStageFiles(stageFiles: Set<string>, stageCount: number): void {
  if (stageFiles.size !== stageCount) {
    throw new Error('Stage files must be unique within a flow.');
  }
}

async function removeObsoleteStageFiles({
  flowRoot,
  previousStageFiles,
  nextStageFiles
}: {
  flowRoot: string;
  previousStageFiles: Set<string>;
  nextStageFiles: Set<string>;
}): Promise<void> {
  for (const previousStageFile of previousStageFiles) {
    if (nextStageFiles.has(previousStageFile)) {
      continue;
    }
    if (previousStageFile === '.index.md') {
      continue;
    }
    const stagePath = path.resolve(flowRoot, previousStageFile);
    if (isInside(flowRoot, stagePath)) {
      await fs.rm(stagePath, { force: true });
    }
  }
}

function normalizeFlowId(rawId: string): string {
  const id = rawId.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id)) {
    throw new Error('Flow id must contain only letters, numbers, dot, underscore or dash and must not be empty.');
  }
  if (id.includes('..')) {
    throw new Error('Flow id must not contain path traversal segments.');
  }
  return id;
}

async function writeAtomic(targetPath: string, content: string): Promise<void> {
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, content, 'utf8');
  await fs.rename(tempPath, targetPath);
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
