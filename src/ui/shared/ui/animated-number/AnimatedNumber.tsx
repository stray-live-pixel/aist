import { memo } from 'react';

import { classNames } from '../lib/classNames';
import styles from './AnimatedNumber.module.scss';

export type AnimatedNumberProps = {
  value: number;
  formatter?: (value: number) => string;
  className?: string;
};

/**
 * Что это: компактное числовое значение с мягким обновлением по ключу.
 * Зачем нужно: одинаково анимировать меняющиеся counters без локальной логики в feature-компонентах.
 */
export const AnimatedNumber = memo(function AnimatedNumber({ value, formatter, className }: AnimatedNumberProps) {
  const normalizedValue = Number.isFinite(value) ? value : 0;
  const text = formatter ? formatter(normalizedValue) : String(normalizedValue);

  return (
    <span key={text} className={classNames(styles.root, className)}>
      {text}
    </span>
  );
});
