import fs from 'node:fs/promises';
import path from 'node:path';

import { type FrontmatterObject, type FrontmatterValue, parseMarkdownFrontmatter } from './frontmatter';
import type {
  AutonomousDefinitionDiagnostic,
  AutonomousDefinitions,
  AutonomousFlowDefinition,
  AutonomousRunDefinition,
  AutonomousRunTaskDefinition,
  AutonomousSourceKind,
  AutonomousStageContext,
  AutonomousStageDefinition
} from './types';

export const AUTONOMOUS_ROOT_RELATIVE_PATH = path.join('.aist-agent', 'autonomous');

export type AutonomousDiscoveryOptions = {
  workspaceRoot: string;
  includeLegacyPrompt?: boolean;
};

type DefinitionSource = {
  kind: AutonomousSourceKind;
  flowsRoot: string;
  runsRoot: string;
};

/**
 * Ищет flow/run definitions в native `.aist-agent/autonomous` и, на период
 * миграции, в legacy `prompt/`. Discovery только читает Markdown и не запускает
 * Python/shell, чтобы UI мог безопасно показывать definitions до исполнения.
 */
export async function discoverAutonomousDefinitions(
  options: AutonomousDiscoveryOptions
): Promise<AutonomousDefinitions> {
  const sources = createDefinitionSources(options);
  const flows: AutonomousFlowDefinition[] = [];
  const runs: AutonomousRunDefinition[] = [];
  const diagnostics: AutonomousDefinitionDiagnostic[] = [];

  for (const source of sources) {
    const [sourceFlows, sourceRuns] = await Promise.all([
      discoverFlows(source).catch((error: unknown) => {
        diagnostics.push(toDiagnostic('source.notFound', error, source.flowsRoot));
        return [];
      }),
      discoverRuns(source).catch((error: unknown) => {
        diagnostics.push(toDiagnostic('source.notFound', error, source.runsRoot));
        return [];
      })
    ]);
    flows.push(...sourceFlows);
    runs.push(...sourceRuns);
  }

  return { flows: preferNativeDefinitions(flows), runs: preferNativeDefinitions(runs), diagnostics };
}

export async function importLegacyDefinitions(workspaceRoot: string): Promise<void> {
  const legacyRoot = path.join(workspaceRoot, 'prompt');
  const nativeRoot = path.join(workspaceRoot, AUTONOMOUS_ROOT_RELATIVE_PATH);
  await copyDirectory(path.join(legacyRoot, 'flows'), path.join(nativeRoot, 'flows'));
  await copyDirectory(path.join(legacyRoot, 'runs'), path.join(nativeRoot, 'runs'));
}

function createDefinitionSources(options: AutonomousDiscoveryOptions): DefinitionSource[] {
  const nativeRoot = path.join(options.workspaceRoot, AUTONOMOUS_ROOT_RELATIVE_PATH);
  const sources: DefinitionSource[] = [
    { kind: 'native', flowsRoot: path.join(nativeRoot, 'flows'), runsRoot: path.join(nativeRoot, 'runs') }
  ];

  if (options.includeLegacyPrompt === true) {
    const legacyRoot = path.join(options.workspaceRoot, 'prompt');
    sources.push({
      kind: 'legacy',
      flowsRoot: path.join(legacyRoot, 'flows'),
      runsRoot: path.join(legacyRoot, 'runs')
    });
  }

  return sources;
}

async function discoverFlows(source: DefinitionSource): Promise<AutonomousFlowDefinition[]> {
  const entries = await safeReadDirectories(source.flowsRoot);
  return Promise.all(entries.map((entry) => readFlowDefinition(source, entry)));
}

async function discoverRuns(source: DefinitionSource): Promise<AutonomousRunDefinition[]> {
  const entries = await safeReadDirectories(source.runsRoot);
  return Promise.all(entries.map((entry) => readRunDefinition(source, entry)));
}

async function readFlowDefinition(source: DefinitionSource, id: string): Promise<AutonomousFlowDefinition> {
  const flowRoot = path.join(source.flowsRoot, id);
  const indexPath = path.join(flowRoot, '.index.md');
  const diagnostics: AutonomousDefinitionDiagnostic[] = [];
  let attributes: FrontmatterObject = {};
  let body = '';

  try {
    const parsed = parseMarkdownFrontmatter(await fs.readFile(indexPath, 'utf8'));
    attributes = parsed.attributes;
    body = parsed.body.trim();
  } catch (error) {
    diagnostics.push(toDiagnostic('flow.indexMissing', error, indexPath));
  }

  const stageFiles = asStringArray(attributes.stages);
  const stages: AutonomousStageDefinition[] = [];
  for (let stageIndex = 0; stageIndex < stageFiles.length; stageIndex += 1) {
    const stageFile = stageFiles[stageIndex];
    const stage = await readStageDefinition(flowRoot, stageFile, stageIndex + 1, diagnostics);
    if (stage) {
      stages.push(stage);
    }
  }

  return {
    id,
    title: asString(attributes.title) || id,
    description: asString(attributes.description) || '',
    body,
    defaultModel: asString(attributes.model),
    defaultCodexModel: asString(attributes.codex_model),
    defaultSummaryRules: asString(attributes.default_summary_rules),
    stages,
    sourceKind: source.kind,
    sourcePath: flowRoot,
    diagnostics
  };
}

async function readStageDefinition(
  flowRoot: string,
  stageFile: string,
  index: number,
  diagnostics: AutonomousDefinitionDiagnostic[]
): Promise<AutonomousStageDefinition | undefined> {
  const stagePath = path.join(flowRoot, stageFile);
  try {
    const parsed = parseMarkdownFrontmatter(await fs.readFile(stagePath, 'utf8'));
    return {
      index,
      file: stageFile,
      title: asString(parsed.attributes.title) || stageFile,
      body: parsed.body.trim(),
      model: asString(parsed.attributes.model),
      codexModel: asString(parsed.attributes.codex_model),
      contexts: parseContexts(parsed.attributes.contexts, diagnostics, stagePath),
      summaryRules: asString(parsed.attributes.summary_rules),
      sourcePath: stagePath
    };
  } catch (error) {
    diagnostics.push(toDiagnostic('flow.stageMissing', error, stagePath));
    return undefined;
  }
}

async function readRunDefinition(source: DefinitionSource, id: string): Promise<AutonomousRunDefinition> {
  const runRoot = path.join(source.runsRoot, id);
  const indexPath = path.join(runRoot, '.index.md');
  const diagnostics: AutonomousDefinitionDiagnostic[] = [];
  let attributes: FrontmatterObject = {};

  try {
    attributes = parseMarkdownFrontmatter(await fs.readFile(indexPath, 'utf8')).attributes;
  } catch (error) {
    diagnostics.push(toDiagnostic('run.indexMissing', error, indexPath));
  }

  const workDir = asString(attributes.dir) || '';
  if (!workDir) {
    diagnostics.push({ code: 'run.dirMissing', message: 'Run definition must define dir.', path: indexPath });
  }

  const tasks = await readRunTasks(runRoot, attributes.tasks, diagnostics);

  return {
    id,
    title: asString(attributes.title) || id,
    workDir,
    repeat: asPositiveInteger(attributes.repeat, 1),
    tasks,
    sourceKind: source.kind,
    sourcePath: runRoot,
    diagnostics
  };
}

async function readRunTasks(
  runRoot: string,
  rawTasks: FrontmatterValue | undefined,
  diagnostics: AutonomousDefinitionDiagnostic[]
): Promise<AutonomousRunTaskDefinition[]> {
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];
  const definitions: AutonomousRunTaskDefinition[] = [];

  for (let taskIndex = 0; taskIndex < tasks.length; taskIndex += 1) {
    const task = tasks[taskIndex];
    if (!isObject(task)) {
      diagnostics.push({ code: 'run.taskMissing', message: 'Run task must be an object.', path: runRoot });
      continue;
    }

    const taskPath = asString(task.task);
    const flowId = asString(task.flow);
    if (!taskPath || !flowId) {
      diagnostics.push({ code: 'run.taskMissing', message: 'Run task must define task and flow.', path: runRoot });
      continue;
    }

    const resolvedTaskPath = path.resolve(runRoot, taskPath);
    if (!isInside(runRoot, resolvedTaskPath)) {
      diagnostics.push({
        code: 'run.pathEscapesRoot',
        message: `Task path escapes run root: ${taskPath}`,
        path: taskPath
      });
      continue;
    }

    let body = '';
    try {
      body = (await fs.readFile(resolvedTaskPath, 'utf8')).trim();
    } catch {
      // Legacy run may already have moved all tasks to done. Это diagnostic, но
      // не fatal: UI всё равно должен показать definition и дать пользователю
      // понять, почему запускать нечего.
      diagnostics.push({
        code: 'run.taskMissing',
        message: `Task file is missing: ${taskPath}`,
        path: resolvedTaskPath
      });
    }

    definitions.push({
      index: taskIndex + 1,
      taskPath,
      flowId,
      repeat: asPositiveInteger(task.repeat, 1),
      body,
      sourcePath: resolvedTaskPath
    });
  }

  return definitions;
}

function parseContexts(
  rawContexts: FrontmatterValue | undefined,
  diagnostics: AutonomousDefinitionDiagnostic[],
  sourcePath: string
): AutonomousStageContext[] {
  if (!Array.isArray(rawContexts)) {
    return [];
  }

  const contexts: AutonomousStageContext[] = [];
  for (const rawContext of rawContexts) {
    if (!isObject(rawContext)) {
      diagnostics.push({ code: 'frontmatter.invalid', message: 'Context must be an object.', path: sourcePath });
      continue;
    }

    const mode = asString(rawContext.mode);
    const from = asPositiveInteger(rawContext.from, undefined);
    if (mode === 'continue') {
      contexts.push(from ? { mode, from } : { mode });
    } else if (mode === 'continue-from' && from) {
      contexts.push({ mode, from });
    } else if (mode === 'summary-from' && from) {
      contexts.push({ mode, from, summaryRules: asString(rawContext.summary_rules) });
    } else {
      diagnostics.push({
        code: 'frontmatter.invalid',
        message: `Unsupported context: ${JSON.stringify(rawContext)}`,
        path: sourcePath
      });
    }
  }

  return contexts;
}

async function safeReadDirectories(root: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

function preferNativeDefinitions<T extends { id: string; sourceKind: AutonomousSourceKind }>(definitions: T[]): T[] {
  const byId = new Map<string, T>();
  for (const definition of definitions) {
    const previous = byId.get(definition.id);
    if (!previous || (previous.sourceKind === 'legacy' && definition.sourceKind === 'native')) {
      byId.set(definition.id, definition);
    }
  }

  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

async function copyDirectory(source: string, target: string): Promise<void> {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

function asString(value: FrontmatterValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asStringArray(value: FrontmatterValue | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asPositiveInteger(value: FrontmatterValue | undefined, fallback: number): number;
function asPositiveInteger(value: FrontmatterValue | undefined, fallback: undefined): number | undefined;
function asPositiveInteger(value: FrontmatterValue | undefined, fallback: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}

function isObject(value: FrontmatterValue | undefined): value is FrontmatterObject {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function toDiagnostic(
  code: AutonomousDefinitionDiagnostic['code'],
  error: unknown,
  sourcePath: string
): AutonomousDefinitionDiagnostic {
  return { code, message: error instanceof Error ? error.message : String(error), path: sourcePath };
}
