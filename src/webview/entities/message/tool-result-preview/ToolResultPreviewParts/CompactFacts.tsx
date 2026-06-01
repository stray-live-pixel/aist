import styles from '../ToolResultPreview.module.scss';

export function CompactFacts({ result }: { result: Record<string, unknown> }) {
  const facts = Object.entries(result)
    .filter(([, value]) => typeof value !== 'object')
    .map(([key, value]) => `${key}: ${String(value)}`);

  return <p className={styles.compactFacts}>{facts.join(' · ')}</p>;
}
