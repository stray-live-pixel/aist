import type { CSSProperties } from 'react';

import { getWebviewAssetUri } from '../lib/assets';
import styles from './AistLogo.module.scss';

type AistLogoProps = {
  className?: string;
  assetKey?: string;
  title?: string;
};

type AistAnimatedLogoProps = Omit<AistLogoProps, 'assetKey'> & {
  baseAssetKey?: string;
  frameAssetKeys?: readonly string[];
};

type LogoStyle = CSSProperties & {
  '--aist-logo-uri': string;
};

type AnimatedLogoFrameStyle = CSSProperties & {
  '--aist-logo-frame-uri': string;
};

const DEFAULT_ANIMATION_FRAME_ASSET_KEYS = [
  'logoAnimStep1',
  'logoAnimStep2',
  'logoAnimStep3',
  'logoAnimStep4',
  'logoAnimStep5'
] as const;

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
 * Проигрывает пять SVG-кадров вперед и назад за прежние 1800ms.
 *
 * Использование: <AistAnimatedLogo />.
 * Все пять картинок лежат отдельными mask-слоями и меняются только через
 * opacity: так виден честный cross-fade между кадрами, а браузеру не нужно
 * пересчитывать URL маски внутри keyframes.
 */
export function AistAnimatedLogo({
  className = '',
  baseAssetKey = 'logo',
  frameAssetKeys = DEFAULT_ANIMATION_FRAME_ASSET_KEYS,
  title = 'aist'
}: AistAnimatedLogoProps) {
  const baseLogoUri = getWebviewAssetUri(baseAssetKey);
  const frameLogoUris = frameAssetKeys.map((assetKey) => getWebviewAssetUri(assetKey));

  if (!baseLogoUri || frameLogoUris.some((frameLogoUri) => !frameLogoUri)) {
    return <AistLogo className={className} assetKey={baseAssetKey} title={title} />;
  }

  return (
    <span className={`${styles.logo} ${styles.animated} ${className}`.trim()} role="img" aria-label={title}>
      {frameLogoUris.map((frameLogoUri) => {
        const style: AnimatedLogoFrameStyle = {
          '--aist-logo-frame-uri': `url(${frameLogoUri})`
        };

        return <span aria-hidden="true" className={styles.animationFrame} key={frameLogoUri} style={style} />;
      })}
    </span>
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
