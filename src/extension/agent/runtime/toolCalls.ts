import type { ToolCall } from '../../openrouter/types';
import type { RepeatedToolCall } from '../types';

/**
 * Безопасно парсит аргументы tool call от модели.
 *
 * Модель может вернуть объект или JSON-строку. При невалидном формате функция
 * возвращает пустой объект, чтобы выполнение инструмента получило предсказуемый
 * input, а ошибка осталась локальной для конкретного tool call.
 */
export function parseToolArguments(rawArgs: unknown): Record<string, unknown> {
  if (!rawArgs) {
    return {};
  }

  if (typeof rawArgs === 'object' && !Array.isArray(rawArgs)) {
    return rawArgs as Record<string, unknown>;
  }

  try {
    const parsed = JSON.parse(String(rawArgs));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getToolReason(args: Record<string, unknown>): string {
  const reason = args.reason;
  return typeof reason === 'string' && reason.trim() ? reason.trim() : 'No reason provided by the model.';
}

/**
 * Находит повтор одного и того же tool call внутри одного agent loop.
 *
 * Это предохранитель от бесконечных циклов модели. Поле reason исключается из
 * сигнатуры, потому что оно объясняет действие, но не меняет его результат.
 */
export function findRepeatedToolCall(toolCalls: ToolCall[], counts: Map<string, number>): RepeatedToolCall | undefined {
  for (const toolCall of toolCalls) {
    const args = parseToolArguments(toolCall.function.arguments);
    const signature = getToolCallSignature(toolCall.function.name, args);
    const count = (counts.get(signature) || 0) + 1;
    counts.set(signature, count);

    if (count > 2) {
      return {
        signature,
        count,
        toolName: toolCall.function.name,
        args
      };
    }
  }

  return undefined;
}

export function getRepeatedToolCallAnswer(toolCall: RepeatedToolCall): string {
  return [
    `Остановился, потому что модель повторила один и тот же вызов инструмента ${toolCall.toolName} ${toolCall.count} раза подряд в рамках одного запроса.`,
    'Результат такого вызова уже есть в контексте, поэтому дальнейшее повторение, скорее всего, было бы бесконечным циклом.',
    'Попробуйте уточнить задачу или попросить продолжить с учетом уже полученных результатов.'
  ].join('\n');
}

export function redactLargeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    result[key] = typeof value === 'string' && value.length > 600 ? `${value.slice(0, 600)}... <truncated>` : value;
  }
  return result;
}

function getToolCallSignature(toolName: string, args: Record<string, unknown>): string {
  const { reason: _reason, ...semanticArgs } = args;
  return `${toolName}:${stableStringify(semanticArgs)}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}
