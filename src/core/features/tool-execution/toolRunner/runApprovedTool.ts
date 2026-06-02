import { createPlanFromArgs, updatePlanItemStatus } from '../../planning/planningTools';
import type { ToolRunnerRuntime } from './ToolRunnerRuntime';
import { normalizeReasoningEffort } from './normalizeReasoningEffort';
import type { ToolExecutionPreview } from './types';

/**
 * Что это: запускает tool после approval/permission check.
 * Зачем нужно: разные kind tool имеют разные adapters, но общий result contract.
 * Какую продуктовую проблему решает: filesystem/project/skill/planning/model tools выполняются единым lifecycle.
 */
export async function runApprovedTool({
  runtime,
  toolName,
  args,
  chatId,
  previewHandle
}: RunApprovedToolInput): Promise<Record<string, unknown>> {
  if (previewHandle) return previewHandle.approve();

  const tool = runtime.deps.registry.getTool(toolName);
  switch (tool?.kind) {
    case 'planning':
      return runPlanningTool({ runtime, toolName, args, chatId });
    case 'model':
      return runModelTool({ runtime, args, chatId, toolName });
    case 'project':
      return runProjectTool({ runtime, toolName, args });
    case 'skill':
      return runSkillTool({ runtime, toolName, args });
    case 'builtin':
    default:
      return runtime.deps.filesystem.execute(toolName, args);
  }
}

/** Что это: выполняет create/update plan tools; зачем нужно: planning tools меняют activePlan без внешнего adapter; проблема: план агента persist-ится в chat state. */
async function runPlanningTool({ runtime, toolName, args, chatId }: PlanningInput): Promise<Record<string, unknown>> {
  if (toolName === 'create_plan' || toolName === 'update_plan') {
    const plan = createPlanFromArgs(args);
    await runtime.deps.context.setActivePlan(chatId, plan);
    return { ok: true, action: toolName, title: plan.title, itemCount: plan.items.length };
  }

  const plan = updatePlanItemStatus(runtime.deps.context.getActivePlan(chatId), args);
  await runtime.deps.context.setActivePlan(chatId, plan);
  return {
    ok: true,
    action: toolName,
    itemIndex: Number(args.itemIndex),
    status: String(args.status),
    title: plan.title
  };
}

/** Что это: выполняет invoke_model через auxiliary model; зачем нужно: агент может спросить лёгкую модель как tool; проблема: подзадачи решаются без основного runtime turn. */
async function runModelTool({ runtime, args, chatId, toolName }: ModelInput): Promise<Record<string, unknown>> {
  if (!runtime.deps.auxiliaryModel) throw new Error('Auxiliary model invoker is not configured.');
  const prompt = typeof args.prompt === 'string' ? args.prompt.trim() : '';
  if (!prompt) throw new Error('invoke_model requires a non-empty prompt.');

  const system = typeof args.system === 'string' && args.system.trim() ? args.system.trim() : undefined;
  const settings = (await runtime.deps.getAuxiliaryModelSettings?.(toolName)) || {};
  const model = typeof args.model === 'string' && args.model.trim() ? args.model.trim() : settings.model;
  const reasoningEffort = normalizeReasoningEffort({ value: args.reasoningEffort }) || settings.reasoningEffort;
  const response = await runtime.deps.auxiliaryModel.invoke({
    model,
    reasoningEffort,
    messages: [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      { role: 'user' as const, content: prompt }
    ],
    tools: settings.allowTools === true ? runtime.deps.registry.snapshot().tools : undefined
  });

  return {
    ok: true,
    chatId,
    model: model || 'configured auxiliary tool model',
    modelSource: typeof args.model === 'string' && args.model.trim() ? 'argument' : 'settings',
    content: response.content || '',
    reasoning: response.reasoning,
    usage: response.usage
  };
}

/** Что это: выполняет project tool; зачем нужно: либо adapter, либо registry project runner с workspaceRoot; проблема: кастомные project tools работают без монолита. */
function runProjectTool({ runtime, toolName, args }: AdapterInput): Promise<Record<string, unknown>> {
  if (runtime.deps.projectTools) return runtime.deps.projectTools.execute(toolName, args);
  if (!runtime.deps.workspaceRoot) throw new Error(`Project tool adapter is missing for ${toolName}.`);
  return runtime.deps.registry.runProjectTool(toolName, args, runtime.deps.workspaceRoot);
}

/** Что это: выполняет skill tool через adapter; зачем нужно: skills запускаются отдельно от builtin filesystem; проблема: отсутствующий adapter даёт понятную ошибку. */
function runSkillTool({ runtime, toolName, args }: AdapterInput): Promise<Record<string, unknown>> {
  if (!runtime.deps.skills) throw new Error(`Skill tool adapter is missing for ${toolName}.`);
  return runtime.deps.skills.execute(toolName, args);
}

type RunApprovedToolInput = {
  runtime: ToolRunnerRuntime;
  toolName: string;
  args: Record<string, unknown>;
  chatId: string;
  previewHandle?: ToolExecutionPreview;
};
type PlanningInput = { runtime: ToolRunnerRuntime; toolName: string; args: Record<string, unknown>; chatId: string };
type ModelInput = PlanningInput;
type AdapterInput = { runtime: ToolRunnerRuntime; toolName: string; args: Record<string, unknown> };
