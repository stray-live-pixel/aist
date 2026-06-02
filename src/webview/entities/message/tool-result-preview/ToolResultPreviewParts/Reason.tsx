import styles from '../ToolResultPreview.module.scss';

export function Reason({ text }: { text: string }) {
  return <p className={styles.reason}>{text}</p>;
}
