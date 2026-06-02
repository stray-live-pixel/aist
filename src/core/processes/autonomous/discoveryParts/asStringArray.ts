import { type FrontmatterValue } from '../../../shared/lib/frontmatter';

export function asStringArray(value: FrontmatterValue | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
