import { MAX_EXCERPT_ITEMS } from './MAX_EXCERPT_ITEMS';

export function formatList(values: string[]): string {
  if (!values.length) {
    return 'none detected';
  }

  const visible = values.slice(0, MAX_EXCERPT_ITEMS);
  const suffix = values.length > visible.length ? `, +${values.length - visible.length} more` : '';
  return `${visible.join(', ')}${suffix}`;
}
