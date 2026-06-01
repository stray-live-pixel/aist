import { Folder } from 'lucide-react';

import { asRecord, asString } from '../../tool-value';

export function renderEntryItem(entry: unknown, index: number) {
  const item = asRecord(entry);
  const path = asString(item?.path) || `entry-${index}`;
  const type = asString(item?.type) || 'file';

  return (
    <li key={`${path}-${index}`}>
      <Folder size={13} />
      <span>{path}</span>
      <em>{type}</em>
    </li>
  );
}
