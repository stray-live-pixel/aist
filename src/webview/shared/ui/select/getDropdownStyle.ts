import type { CSSProperties } from 'react';

import type { DropdownPosition } from './types';

/**
 * Что это: строит inline-стиль portal-dropdown Select.
 * Зачем нужно: при первом открытии React добавляет dropdown в body раньше, чем layout effect успевает посчитать координаты.
 * Какую продуктовую проблему решает: пустой portal-элемент не создаёт визуальную полосу внизу webview на первый frame.
 */
export function getDropdownStyle({ dropdownPosition }: { dropdownPosition?: DropdownPosition }): CSSProperties {
  if (!dropdownPosition) {
    return getHiddenDropdownStyle();
  }

  return {
    top: dropdownPosition.top,
    left: dropdownPosition.left,
    width: dropdownPosition.width,
    height: dropdownPosition.maxHeight,
    maxHeight: dropdownPosition.maxHeight
  };
}

/**
 * Что это: безопасная позиция dropdown до расчёта координат.
 * Зачем нужно: portal уже в DOM, но пользователь не должен видеть и измерять незапозиционированную панель.
 * Какую продуктовую проблему решает: открытие Select не меняет видимую область страницы даже на первый кадр.
 */
function getHiddenDropdownStyle(): CSSProperties {
  return {
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    maxHeight: 0,
    opacity: 0,
    pointerEvents: 'none',
    transform: 'translate3d(-100vw, -100vh, 0)'
  };
}
