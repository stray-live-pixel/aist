import styles from '../ToolResultPreview.module.scss';

export function DeniedResult({ result }: { result: Record<string, unknown> }) {
  const facts = [
    `decision: ${String(result.decision)}`,
    `continueAfterDeny: ${String(Boolean(result.continueAfterDeny))}`
  ];
  return <p className={styles.compactFacts}>{facts.join(' · ')}</p>;
}
