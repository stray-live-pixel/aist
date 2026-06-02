import styles from '../ToolResultPreview.module.scss';

export function ErrorText({ text }: { text: string }) {
  return <p className={styles.errorText}>{text}</p>;
}
