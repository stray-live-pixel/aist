import type { ChatPlan, ChatPlanItem, ChatPlanItemStatus } from '../chats/types';
import type { OpenRouterTool } from '../openrouter/types';

export const PLAN_TOOL_NAMES = ['create_plan', 'update_plan', 'set_plan_item_status'] as const;

export type PlanToolName = (typeof PLAN_TOOL_NAMES)[number];

/**
 * Инструменты планирования отделены от filesystem tools, потому что они меняют
 * только состояние активного чата. Модель всё равно видит их как обычные tools и
 * обязана объяснить reason, но runtime не трогает workspace-файлы.
 */
export const planningTools: OpenRouterTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_plan',
      description:
        'Create the active implementation plan before changing code. Steps must be short, sequential, unambiguous one-sentence actions.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why this plan is needed.' },
          title: { type: 'string', description: 'What is being implemented in this plan.' },
          steps: {
            type: 'array',
            description: 'Short sequential implementation steps, one sentence each.',
            items: { type: 'string' }
          }
        },
        required: ['reason', 'title', 'steps'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_plan',
      description:
        'Replace the active implementation plan when the plan meaning changes. Keep steps short, sequential, and unambiguous.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why the plan must change.' },
          title: { type: 'string', description: 'Updated title of the active plan.' },
          steps: {
            type: 'array',
            description: 'Updated full list of plan steps, one sentence each.',
            items: { type: 'string' }
          }
        },
        required: ['reason', 'title', 'steps'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'set_plan_item_status',
      description: 'Change status of one active plan item without changing the plan text.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'A short explanation of why this status changed.' },
          itemIndex: { type: 'number', description: '1-based plan item number.' },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'done', 'blocked'],
            description: 'New status for the plan item.'
          }
        },
        required: ['reason', 'itemIndex', 'status'],
        additionalProperties: false
      }
    }
  }
];

/** Проверяет имя инструмента без строковых includes по всему runtime. */
export function isPlanningTool(toolName: string): toolName is PlanToolName {
  return PLAN_TOOL_NAMES.includes(toolName as PlanToolName);
}

/**
 * Создаёт новый план из аргументов модели. Старые статусы намеренно не переносятся:
 * create/update меняют смысл плана целиком и проходят через approval.
 */
export function createPlanFromArgs(args: Record<string, unknown>): ChatPlan {
  const title = requireNonEmptyString(args.title, 'title');
  const steps = normalizeSteps(args.steps);

  return {
    title,
    items: steps.map((text, index) => ({
      id: `item-${index + 1}`,
      text,
      status: index === 0 ? 'in_progress' : 'pending'
    }))
  };
}

/**
 * Меняет только статус пункта и сохраняет остальные тексты/статусы. Индекс 1-based,
 * потому что так его проще читать человеку в plan widget и tool-call JSON.
 */
export function updatePlanItemStatus(plan: ChatPlan | undefined, args: Record<string, unknown>): ChatPlan {
  if (!plan) {
    throw new Error('Cannot update plan item status because active plan is missing.');
  }

  const itemIndex = Math.floor(Number(args.itemIndex));
  if (!Number.isInteger(itemIndex) || itemIndex < 1 || itemIndex > plan.items.length) {
    throw new Error(`Plan item index is out of range: ${args.itemIndex}`);
  }

  const status = normalizePlanStatus(args.status);
  const items = plan.items.map((item, index) => (index === itemIndex - 1 ? { ...item, status } : item));
  return { ...plan, items };
}

function normalizeSteps(rawSteps: unknown): string[] {
  if (!Array.isArray(rawSteps)) {
    throw new Error('Tool argument "steps" must be an array.');
  }

  const steps = rawSteps.map((step) => String(step || '').trim()).filter(Boolean);
  if (!steps.length) {
    throw new Error('Plan must contain at least one step.');
  }

  return steps;
}

function normalizePlanStatus(value: unknown): ChatPlanItemStatus {
  if (value === 'pending' || value === 'in_progress' || value === 'done' || value === 'blocked') {
    return value;
  }

  throw new Error(`Unsupported plan item status: ${String(value)}`);
}

function requireNonEmptyString(value: unknown, name: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    throw new Error(`Tool argument "${name}" must be a non-empty string.`);
  }
  return text;
}

export type { ChatPlan, ChatPlanItem, ChatPlanItemStatus };
