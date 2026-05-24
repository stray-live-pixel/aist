export type WebviewAssets = Record<string, string>;

declare global {
  interface Window {
    __AIST_ASSETS__?: WebviewAssets;
  }
}

/**
 * Возвращает URI ассета по ключу из manifest, который host встраивает в HTML.
 *
 * Использование: const logoUri = getWebviewAssetUri('logo');
 * Webview-код не вызывает asWebviewUri напрямую, поэтому получает уже готовые
 * безопасные URI через общий manifest.
 */
export function getWebviewAssetUri(assetKey: string): string | undefined {
  return window.__AIST_ASSETS__?.[assetKey];
}
