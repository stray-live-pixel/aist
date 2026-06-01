import { type FrontmatterObject, type FrontmatterValue } from '../../../shared/lib/frontmatter';

export function isObject(value: FrontmatterValue | undefined): value is FrontmatterObject {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
