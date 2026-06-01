import { type FrontmatterValue } from '../../../shared/lib/frontmatter';

export function asString(value: FrontmatterValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
