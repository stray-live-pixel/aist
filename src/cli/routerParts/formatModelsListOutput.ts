import { ModelsListResult } from './ModelsListResult';
import { formatJsonOutput } from './formatJsonOutput';
import { formatModelLine } from './formatModelLine';

export function formatModelsListOutput(result: ModelsListResult, json: boolean): string {
  if (json) {
    return formatJsonOutput(result);
  }

  const title = result.refreshed ? 'AIST models refreshed' : 'AIST models';
  const note = result.fallbackUsed ? 'Using fallback models for unavailable providers.\n' : '';
  const lines = result.models.map((model) => formatModelLine(model));

  return `${title}\n${note}${lines.length ? lines.join('\n') : '(no models)'}\n`;
}
