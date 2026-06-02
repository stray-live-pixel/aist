import { useEffect } from 'react';

/**
 * Что это: lifecycle открытого dropdown Select.
 * Зачем нужно: dropdown фокусирует search, закрывается по outside click/Escape и обновляет position при scroll/resize.
 * Какую продуктовую проблему решает: Select ведёт себя как нативный контрол в VS Code webview и не застревает открытым.
 */
export function useSelectDropdownLifecycle({
  open,
  rootRef,
  dropdownRef,
  searchRef,
  closeDropdown,
  updateDropdownPosition
}: {
  open: boolean;
  rootRef: React.RefObject<HTMLElement | null>;
  dropdownRef: React.RefObject<HTMLElement | null>;
  searchRef: React.RefObject<HTMLInputElement | null>;
  closeDropdown(): void;
  updateDropdownPosition(): void;
}) {
  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !dropdownRef.current?.contains(target)) closeDropdown();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeDropdown();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [open]);
}
