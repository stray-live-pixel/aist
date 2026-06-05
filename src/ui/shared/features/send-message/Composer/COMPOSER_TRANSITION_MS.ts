/**
 * Что это: длительность exit/enter анимации composer.
 * Зачем нужно: timeout удаления sent snapshot должен совпадать с CSS-анимацией.
 * Какую продуктовую проблему решает: старый composer не исчезает раньше визуального «улёта» сообщения.
 */
export const COMPOSER_TRANSITION_MS = 500;
