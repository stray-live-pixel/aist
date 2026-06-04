import { type ReactNode } from 'react';

import { classNames } from '../lib/classNames';
import styles from './KeyValueGrid.module.scss';

export type KeyValueItem = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  title?: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
};

export type KeyValueGridProps = {
  items: readonly KeyValueItem[];
  columns?: 'auto' | 'one' | 'two' | 'three';
  className?: string;
};

/**
 * Что это: компактная сетка label/value для технических фактов.
 * Зачем нужно: session details, storage paths и diagnostics выглядят одинаково и не плодят локальные meta-классы.
 * Пример: <KeyValueGrid items={[{ key: 'branch', label: 'Branch', value: branch }]} />.
 */
export function KeyValueGrid({ items, columns = 'auto', className }: KeyValueGridProps) {
  return (
    <dl className={classNames(styles.grid, styles[columns], className)}>
      {items.map((item) => (
        <div key={item.key} className={classNames(styles.item, item.tone && styles[item.tone])}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={styles.value} title={item.title}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
