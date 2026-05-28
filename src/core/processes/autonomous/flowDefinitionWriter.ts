import fs from 'node:fs/promises';
import path from 'node:path';

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
export async function deleteAutonomousFlowDefinition(workspaceRoot: string, flowId: string): Promise<void> {
  const flowRoot = getNativeFlowRoot(workspaceRoot, normalizeFlowId(flowId));
  await fs.rm(flowRoot, { recursive: true, force: true });
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
    const stagePath = path.resolve(flowRoot, stage.file);
    if (!isInside(flowRoot, stagePath)) {
      throw new Error(`Stage path escapes flow root: ${stage.file}`);
    }

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
