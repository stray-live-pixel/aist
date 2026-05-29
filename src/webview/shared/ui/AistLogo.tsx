import { type CSSProperties, useState } from 'react';

import { getWebviewAssetUri } from '../lib/assets';
import styles from './AistLogo.module.scss';

const DEFAULT_ANIMATION_ASSET_KEYS = ['logoAnimGif', 'logoAnimGif2'];

type AistLogoProps = {
  className?: string;
  assetKey?: string;
  title?: string;
};

type AistAnimatedLogoProps = Omit<AistLogoProps, 'assetKey'> & {
  baseAssetKey?: string;
  animationAssetKeys?: string[];
};

type LogoStyle = CSSProperties & {
  '--aist-logo-uri': string;
};

type AnimatedLogoStyle = CSSProperties & {
  '--aist-logo-animation-uri': string;
};

/**
 * Рисует SVG-логотип как CSS-mask, чтобы он наследовал цвет текста VS Code.
 *
 * Использование: <AistLogo /> или <AistLogo className={styles.mutedLogo} />.
 * Компонент берет URI из общего webview asset manifest, а не импортирует файл
 * напрямую, потому что в VS Code webview нужны URI, созданные host-частью.
 */
export function AistLogo({ className = '', assetKey = 'logo', title = 'aist' }: AistLogoProps) {
  const logoUri = getWebviewAssetUri(assetKey);

  if (!logoUri) {
    return null;
  }

  const style: LogoStyle = {
    '--aist-logo-uri': `url(${logoUri})`
  };

  return <span className={`${styles.logo} ${className}`.trim()} style={style} role="img" aria-label={title} />;
}

/**
 * Проигрывает случайную готовую GIF-анимацию логотипа из общего webview asset manifest.
 *
 * Использование: <AistAnimatedLogo />.
 * Если GIF недоступен, компонент возвращается к статичному SVG-логотипу.
 */
export function AistAnimatedLogo({
  className = '',
  baseAssetKey = 'logo',
  animationAssetKeys = DEFAULT_ANIMATION_ASSET_KEYS,
  title = 'aist'
}: AistAnimatedLogoProps) {
  const [animationUri] = useState(() => {
    const animationUris = animationAssetKeys
      .map((assetKey) => getWebviewAssetUri(assetKey))
      .filter((uri): uri is string => Boolean(uri));

    return getRandomItem(animationUris);
  });

  if (!animationUri) {
    return <AistLogo className={className} assetKey={baseAssetKey} title={title} />;
  }

  const style: AnimatedLogoStyle = {
    '--aist-logo-animation-uri': `url(${animationUri})`
  };

  return (
    <span
      className={`${styles.logo} ${styles.animated} ${className}`.trim()}
      style={style}
      role="img"
      aria-label={title}
    />
  );
}

/**
 * Брендовый блок для стартового состояния и Storybook.
 *
 * Использование: <AistBrand animated />.
 * Текст держится рядом с логотипом, чтобы стартовый экран и документация
 * показывали один и тот же образ расширения.
 */
export function AistBrand({ animated = false }: { animated?: boolean }) {
  const Logo = animated ? AistAnimatedLogo : AistLogo;

  return (
    <div className={styles.brand}>
      <Logo />
      <div className={styles.brandText}>
        <div className={styles.brandTitle}>AIST AGENT</div>
        <div className={styles.brandSubtitle}>Above the complexity</div>
      </div>
    </div>
  );
}

function getRandomItem<T>(items: T[]): T | undefined {
  if (!items.length) return undefined;

  return items[Math.floor(Math.random() * items.length)];
}
