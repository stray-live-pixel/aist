import { type CSSProperties, type ReactNode, memo } from 'react';

import { AnimatedNumber } from '../animated-number';
import { classNames } from '../lib/classNames';
import { Tooltip } from '../tooltip';
import styles from './CompactControl.module.scss';

export type CompactControlGroupProps = {
  /** Inline-группа не переносится и подходит для связанных controls, например индикатора контекста и compact-кнопки. */
  inline?: boolean;
  className?: string;
  children: ReactNode;
};

export type CompactControlItemProps = {
  icon?: ReactNode;
  text: string;
  title?: string;
  className?: string;
};

export type CompactNavigationButtonProps = {
  icon?: ReactNode;
  label?: string;
  title: string;
  disabled?: boolean;
  /** Показывает toggle-состояние для режимов, которые визуально остаются «нажатыми». */
  pressed?: boolean;
  className?: string;
  onClick(): void;
};

export type ContextUsageIndicatorProps = {
  value: number;
  percent: number;
  tooltip: ReactNode;
  formatter?: (value: number) => string;
};

/**
 * Что это: shared-группа компактных controls для composer-like панелей.
 * Зачем нужно: страницы задают только порядок элементов, а переносы, отступы и типографика остаются в дизайн-системе.
 */
export const CompactControlGroup = memo(function CompactControlGroup({
  inline = false,
  className,
  children
}: CompactControlGroupProps) {
  return <div className={classNames(styles.group, inline && styles.groupInline, className)}>{children}</div>;
});

/**
 * Что это: компактная строка «иконка + текст».
 * Зачем нужно: одинаково отображать метаданные composer вроде стоимости, статусов и коротких показателей.
 */
export const CompactControlItem = memo(function CompactControlItem({
  icon,
  text,
  title,
  className
}: CompactControlItemProps) {
  return (
    <span className={classNames(styles.item, className)} title={title || text}>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <span className={styles.text}>{text}</span>
    </span>
  );
});

/**
 * Что это: компактная навигационная кнопка-плашка.
 * Зачем нужно: Composer показывает ссылки на настройки как controls, но внешний вид должен быть общим shared-паттерном.
 */
export const CompactNavigationButton = memo(function CompactNavigationButton({
  icon,
  label,
  title,
  disabled,
  pressed,
  className,
  onClick
}: CompactNavigationButtonProps) {
  return (
    <button
      type="button"
      className={classNames(styles.navigationButton, !label && styles.navigationButtonIconOnly, className)}
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      {label ? <span className={styles.text}>{label}</span> : null}
    </button>
  );
});

/**
 * Что это: круговой индикатор заполненности контекста с текущим числом токенов.
 * Зачем нужно: показатель контекста нужен composer, но сам rendering pie-индикатора является reusable UI и не должен жить на странице чата.
 */
export const ContextUsageIndicator = memo(function ContextUsageIndicator({
  value,
  percent,
  tooltip,
  formatter
}: ContextUsageIndicatorProps) {
  const normalizedPercent = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const fillStyle: CSSProperties = {
    background: `conic-gradient(color-mix(in srgb, var(--vscode-textLink-foreground) 72%, var(--vscode-foreground)) ${normalizedPercent * 3.6}deg, transparent 0deg)`
  };

  return (
    <Tooltip content={tooltip}>
      <span className={styles.item} tabIndex={0} aria-label={typeof tooltip === 'string' ? tooltip : undefined}>
        <span className={styles.icon}>
          <span className={styles.contextPie} aria-hidden="true">
            <span className={styles.contextPieFill} style={fillStyle} />
            <span className={styles.contextPieHole} />
          </span>
        </span>
        <span className={styles.contextValue}>
          <AnimatedNumber value={value} formatter={formatter} />
        </span>
      </span>
    </Tooltip>
  );
});
