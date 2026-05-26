import { type ElementType, type HTMLAttributes, type ReactNode, useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { classNames } from '../lib/classNames';
import styles from './Text.module.scss';

export type TextVariant =
  | 'display'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'code'
  | 'quote'
  | 'danger';

export type TextAlign = 'start' | 'center' | 'end';

export type TextProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  /**
   * Что рендерим: строку с HTML или React-дерево, которое сначала переводится в статическую разметку.
   * Почему ReactNode, а не только string: компонент должен быть drop-in обёрткой для любого текста,
   * но после sanitizing интерактивные React-обработчики намеренно не сохраняются.
   */
  children: ReactNode;
  /**
   * Визуальный пресет типографики. Набор закрытый, чтобы экраны не расходились в произвольных font-size.
   */
  variant?: TextVariant;
  /**
   * Семантический HTML-тег контейнера; варианты отвечают только за вид, а не за document outline.
   */
  as?: ElementType;
  /**
   * Выравнивание оставлено отдельным пропом, потому что это частая настройка без появления новых вариантов.
   */
  align?: TextAlign;
  /**
   * Включает живой shimmer поверх текущего цвета текста.
   * Почему отдельный флаг: переливание — декоративное состояние загрузки/акцента, его нельзя смешивать с variant.
   */
  animatedGradient?: boolean;
  /**
   * Включает cross-fade при изменении children после sanitizing.
   * Почему отдельный флаг: это поведенческая анимация обновления контента, независимая от декоративного shimmer.
   */
  animateContentChanges?: boolean;
};

const SCRIPTABLE_URL_PATTERN = /^(?:javascript|vbscript|data):/i;
const SAFE_DATA_URL_PATTERN = /^data:image\/(?:png|gif|jpe?g|webp|svg\+xml);/i;
const EVENT_ATTRIBUTE_PATTERN = /^on/i;
const URL_ATTRIBUTE_NAMES = new Set(['href', 'src', 'xlink:href', 'formaction', 'poster']);
const CONTENT_CHANGE_ANIMATION_MS = 260;

/**
 * Что это: строгий minimum viable sanitizer для HTML-текста в webview.
 * Почему не вырезаем style: пользовательский сценарий явно разрешает локальные <style>, а JS убираем через
 * удаление scriptable-тегов, inline event handlers и опасных URL-протоколов. CSS всё ещё может влиять на
 * внешний вид блока, поэтому компонент предназначен для доверенного текстового контента проекта, а не для сети.
 */
function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html;
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  removeScriptableElements(document.body);
  sanitizeElementAttributes(document.body);

  return document.body.innerHTML;
}

/**
 * Скриптовые контейнеры удаляются целиком, а не экранируются: иначе браузер может восстановить исполняемое
 * поведение при последующей вставке через innerHTML. <style> здесь намеренно отсутствует.
 */
function removeScriptableElements(rootElement: Element): void {
  rootElement.querySelectorAll('script, iframe, object, embed, link[rel="import"]').forEach((element) => {
    element.remove();
  });
}

/**
 * Атрибуты проверяем на всех элементах после удаления script-тегов: JS часто прячется в on* или href/src.
 * Итерируем по копии, потому что removeAttribute меняет live-коллекцию attributes.
 */
function sanitizeElementAttributes(rootElement: Element): void {
  rootElement.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const attributeName = attribute.name.toLowerCase();
      const attributeValue = attribute.value.trim();

      if (EVENT_ATTRIBUTE_PATTERN.test(attributeName)) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (attributeName === 'srcdoc') {
        element.removeAttribute(attribute.name);
        return;
      }

      if (URL_ATTRIBUTE_NAMES.has(attributeName) && isUnsafeUrl(attributeValue)) {
        element.removeAttribute(attribute.name);
      }
    });
  });
}

/**
 * data: оставляем только для картинок, потому что SVG/HTML data-url может содержать JS-контекст.
 * Относительные URL и якоря безопасны для исполнения JS и нужны для ссылок внутри webview.
 */
function isUnsafeUrl(value: string): boolean {
  if (SAFE_DATA_URL_PATTERN.test(value)) {
    return false;
  }

  return SCRIPTABLE_URL_PATTERN.test(value);
}

/**
 * React-children приводим к HTML до sanitizing, чтобы Text одинаково принимал строки и простую JSX-разметку.
 * renderToStaticMarkup не переносит React event handlers в HTML, но sanitizer всё равно защищает строковые props.
 */
function renderChildrenToHtml(children: ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }

  if (typeof children === 'number' || typeof children === 'bigint' || typeof children === 'boolean') {
    return String(children);
  }

  if (children === null || children === undefined) {
    return '';
  }

  return renderToStaticMarkup(<>{children}</>);
}

/**
 * Храним предыдущую sanitized-разметку ровно на время CSS-анимации: так исчезающий текст успевает плавно уйти,
 * а новый появляется поверх него без ручного diff по символам, который ломал бы вложенные HTML-теги.
 */
function useAnimatedHtmlChange(safeHtml: string, enabled: boolean) {
  const previousSafeHtmlRef = useRef(safeHtml);
  const [exitingHtml, setExitingHtml] = useState<string | null>(null);
  const [contentKey, setContentKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      previousSafeHtmlRef.current = safeHtml;
      setExitingHtml(null);
      return;
    }

    if (previousSafeHtmlRef.current === safeHtml) {
      return;
    }

    setExitingHtml(previousSafeHtmlRef.current);
    previousSafeHtmlRef.current = safeHtml;
    setContentKey((currentKey) => currentKey + 1);

    const timeoutId = window.setTimeout(() => {
      setExitingHtml(null);
    }, CONTENT_CHANGE_ANIMATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [enabled, safeHtml]);

  return { contentKey, exitingHtml };
}

/**
 * Что это: shared-компонент типографики с безопасной HTML-вставкой.
 * Зачем нужно: тексты в настройках, карточках и сообщениях получают единый ограниченный набор вариантов,
 * при этом могут содержать inline-разметку вроде <strong>, <a> или разрешённый <style>.
 */
export function Text({
  as: Component = 'span',
  variant = 'body',
  align = 'start',
  animatedGradient = false,
  animateContentChanges = false,
  className,
  children,
  ...props
}: TextProps) {
  const safeHtml = sanitizeHtml(renderChildrenToHtml(children));
  const { contentKey, exitingHtml } = useAnimatedHtmlChange(safeHtml, animateContentChanges);
  const rootClassName = classNames(
    styles.text,
    styles[variant],
    styles[`align-${align}`],
    animatedGradient && !animateContentChanges && styles.animatedGradient,
    animateContentChanges && styles.changeHost,
    className
  );
  const animatedContentClassName = classNames(animatedGradient && styles.animatedGradient);

  if (!animateContentChanges) {
    return <Component className={rootClassName} dangerouslySetInnerHTML={{ __html: safeHtml }} {...props} />;
  }

  return (
    <Component className={rootClassName} {...props}>
      {exitingHtml ? (
        <span
          className={classNames(styles.exitingContent, animatedContentClassName)}
          dangerouslySetInnerHTML={{ __html: exitingHtml }}
          aria-hidden="true"
        />
      ) : null}
      <span
        key={contentKey}
        className={classNames(styles.enteringContent, animatedContentClassName)}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </Component>
  );
}
