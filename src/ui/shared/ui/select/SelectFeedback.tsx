import styles from './Select.module.scss';

/**
 * Что это: hint/error строка под Select.
 * Зачем нужно: формы получают единый способ показать подсказку или ошибку без дублирования JSX.
 * Какую продуктовую проблему решает: пользователь понимает ограничение или ошибку выбранного значения.
 */
export function SelectFeedback({ error, hint }: { error?: string; hint?: string }) {
  if (error) {
    return <span className={styles.error}>{error}</span>;
  }

  return hint ? <span className={styles.hint}>{hint}</span> : null;
}
