import { Copy } from 'lucide-react';

import { Button } from '../button';
import styles from './CodeBlock.module.scss';

export type CodeBlockProps = {
  value: string;
  label?: string;
  compact?: boolean;
};

/**
 * Что это: компактный monospace-блок с копированием.
 * Почему shared: autonomous event log, command preview и будущие exports должны
 * использовать одинаковую доступную кнопку copy вместо ad-hoc inline controls.
 */
export function CodeBlock({ value, label = 'Code block', compact = false }: CodeBlockProps) {
  return (
    <figure className={styles.figure} aria-label={label}>
      <figcaption className={styles.caption}>
        <span>{label}</span>
        <Button
          size="sm"
          variant="ghost"
          leadingIcon={<Copy size={13} />}
          onClick={() => void navigator.clipboard?.writeText(value)}
        >
          Copy
        </Button>
      </figcaption>
      <pre className={`${styles.pre} ${compact ? styles.compact : ''}`}>
        <code>{value}</code>
      </pre>
    </figure>
  );
}
