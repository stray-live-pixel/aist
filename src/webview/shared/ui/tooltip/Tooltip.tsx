import { type CSSProperties, type ReactNode, useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { classNames } from '../lib/classNames';
import styles from './Tooltip.module.scss';

const TOOLTIP_OFFSET = 8;
const VIEWPORT_PADDING = 8;

type TooltipPosition = {
  top: number;
  left: number;
  transformOrigin: 'bottom center' | 'top center';
  placement: 'top' | 'bottom';
};

export type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  className?: string;
};

type TooltipStyle = CSSProperties & {
  '--tooltip-transform-origin': TooltipPosition['transformOrigin'];
};

/**
 * Что это: компактная подсказка для inline controls с portal-слоем поверх webview.
 * Зачем нужно: ComposerFrame и другие панели могут иметь overflow hidden, поэтому tooltip рендерится в body и не обрезается контейнером.
 */
export function Tooltip({ content, children, className }: TooltipProps) {
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const updatePosition = useCallback(() => {
    const root = rootRef.current;
    const tooltip = tooltipRef.current;
    if (!root || !tooltip) return;

    const rootRect = root.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    const rootCenter = rootRect.left + rootRect.width / 2;
    const left = Math.min(
      Math.max(rootCenter - tooltipRect.width / 2, VIEWPORT_PADDING),
      Math.max(VIEWPORT_PADDING, viewportWidth - tooltipRect.width - VIEWPORT_PADDING)
    );
    const topPlacement = rootRect.top - tooltipRect.height - TOOLTIP_OFFSET;
    const canShowAbove = topPlacement >= VIEWPORT_PADDING;
    const bottomPlacement = Math.min(
      rootRect.bottom + TOOLTIP_OFFSET,
      viewportHeight - tooltipRect.height - VIEWPORT_PADDING
    );

    setPosition({
      top: canShowAbove ? topPlacement : Math.max(VIEWPORT_PADDING, bottomPlacement),
      left,
      transformOrigin: canShowAbove ? 'bottom center' : 'top center',
      placement: canShowAbove ? 'top' : 'bottom'
    });
  }, []);

  useLayoutEffect(() => {
    if (!visible) return undefined;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition, visible]);

  const tooltipStyle: TooltipStyle | undefined = position
    ? {
        top: position.top,
        left: position.left,
        '--tooltip-transform-origin': position.transformOrigin
      }
    : undefined;

  return (
    <span
      ref={rootRef}
      className={classNames(styles.root, className)}
      aria-describedby={visible ? tooltipId : undefined}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocusCapture={() => setVisible(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setVisible(false);
        }
      }}
    >
      {children}
      {visible
        ? createPortal(
            <span
              ref={tooltipRef}
              id={tooltipId}
              className={classNames(
                styles.content,
                position && styles.visible,
                position?.placement && styles[position.placement]
              )}
              style={tooltipStyle}
              role="tooltip"
            >
              {content}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}
