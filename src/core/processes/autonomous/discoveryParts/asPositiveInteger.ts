import { type FrontmatterValue } from '../../../shared/lib/frontmatter';

export function asPositiveInteger(value: FrontmatterValue | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}
