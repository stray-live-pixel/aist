import type { CSSProperties } from 'react';

import { getWebviewAssetUri } from '../lib/assets';

type AistLogoProps = {
  className?: string;
  assetKey?: string;
  title?: string;
};

type AistAnimatedLogoProps = Omit<AistLogoProps, 'assetKey'> & {
  baseAssetKey?: string;
  animatedAssetKey?: string;
};

type LogoStyle = CSSProperties & {
  '--aist-logo-uri': string;
};

type AnimatedLogoStyle = CSSProperties & {
  '--aist-logo-base-uri': string;
  '--aist-logo-animated-uri': string;
};

/**
 * Рисует PNG-логотип как CSS-mask, чтобы он наследовал цвет текста VS Code.
 *
 * Использование: <AistLogo /> или <AistLogo className="text-red-500" />.
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

  return <span className={`aist-logo ${className}`.trim()} style={style} role="img" aria-label={title} />;
}

/**
 * Переключает два PNG-логотипа через opacity примерно раз в секунду.
 *
 * Использование: <AistAnimatedLogo />.
 * Обе картинки остаются CSS-mask, поэтому наследуют цвет текста редактора и не
 * зависят от исходного черного цвета PNG.
 */
export function AistAnimatedLogo({
  className = '',
  baseAssetKey = 'logo',
  animatedAssetKey = 'logoAnimated',
  title = 'aist'
}: AistAnimatedLogoProps) {
  const baseLogoUri = getWebviewAssetUri(baseAssetKey);
  const animatedLogoUri = getWebviewAssetUri(animatedAssetKey);

  if (!baseLogoUri || !animatedLogoUri) {
    return <AistLogo className={className} assetKey={baseAssetKey} title={title} />;
  }

  const style: AnimatedLogoStyle = {
    '--aist-logo-base-uri': `url(${baseLogoUri})`,
    '--aist-logo-animated-uri': `url(${animatedLogoUri})`
  };

  return (
    <span className={`aist-logo aist-logo-animated ${className}`.trim()} style={style} role="img" aria-label={title} />
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
    <div className="aist-brand">
      <Logo />
      <div className="grid gap-1 text-center">
        <div className="aist-brand-title text-base font-semibold tracking-[0.22em]">AIST AGENT</div>
        <div className="aist-brand-subtitle text-sm text-[var(--vscode-descriptionForeground)]">
          Above the complexity
        </div>
      </div>
    </div>
  );
}
