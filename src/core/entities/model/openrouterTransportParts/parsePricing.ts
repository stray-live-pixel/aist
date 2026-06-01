import { type OpenRouterModelPricing } from '../../../shared/types/types';
import { OpenRouterModelApiItem } from './OpenRouterModelApiItem';
import { parsePrice } from './parsePrice';

export function parsePricing(pricing: OpenRouterModelApiItem['pricing']): OpenRouterModelPricing | undefined {
  const prompt = parsePrice(pricing?.prompt);
  const completion = parsePrice(pricing?.completion);

  if (prompt === undefined && completion === undefined) {
    return undefined;
  }

  return { prompt, completion };
}
