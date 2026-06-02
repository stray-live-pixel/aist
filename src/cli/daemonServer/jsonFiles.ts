import fs from 'node:fs';

import type { JsonObject } from '../../core/shared/types/types';
import { isJsonObject } from './jsonGuards';

/**
 * Что это: читает JSON-object из файла или возвращает пустой объект.
 * Зачем нужно: global/workspace settings могут отсутствовать или быть временно повреждены.
 * Какую продуктовую проблему решает: daemon продолжает работать и отдаёт defaults вместо падения config.get.
 */
export async function readOptionalJsonObject({ filePath }: { filePath: string }): Promise<JsonObject> {
  try {
    const parsed = JSON.parse(await fs.promises.readFile(filePath, 'utf8')) as unknown;
    return isJsonObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Что это: рекурсивно merge-ит два JSON-object.
 * Зачем нужно: workspace settings должны переопределять global settings без потери nested defaults.
 * Какую продуктовую проблему решает: итоговый config в UI совпадает с фактическим runtime config.
 */
export function mergeJsonObjects({ base, override }: { base: JsonObject; override: JsonObject }): JsonObject {
  const result: JsonObject = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    result[key] =
      isJsonObject(current) && isJsonObject(value) ? mergeJsonObjects({ base: current, override: value }) : value;
  }
  return result;
}
