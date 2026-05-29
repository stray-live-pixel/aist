import * as vscode from 'vscode';

const WEBVIEW_ASSETS = {
  logo: ['assets', 'logo-main.svg'],
  logoAnimStep1: ['assets', 'logo-anim', '1.svg'],
  logoAnimStep2: ['assets', 'logo-anim', '2.svg'],
  logoAnimStep3: ['assets', 'logo-anim', '3.svg'],
  logoAnimStep4: ['assets', 'logo-anim', '4.svg'],
  logoAnimStep5: ['assets', 'logo-anim', '5.svg'],
  logoAnimGif: ['assets', 'logo-anim', 'animation.gif'],
  logoAnimGif2: ['assets', 'logo-anim', 'animation_2.gif']
} as const;

export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce();
  const assets = createWebviewAssetManifest(webview, extensionUri);
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.css'));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
  <title>aist</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}">window.__AIST_ASSETS__ = ${JSON.stringify(assets)};</script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

/**
 * Готовит manifest ассетов для браузерной части webview.
 *
 * Использование: window.__AIST_ASSETS__.logo в webview-коде.
 * Webview может открывать только URI, созданные через asWebviewUri, поэтому host
 * централизованно публикует безопасные ссылки и не размазывает пути по UI.
 */
function createWebviewAssetManifest(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): Record<keyof typeof WEBVIEW_ASSETS, string> {
  return Object.fromEntries(
    Object.entries(WEBVIEW_ASSETS).map(([key, pathParts]) => [
      key,
      String(webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathParts)))
    ])
  ) as Record<keyof typeof WEBVIEW_ASSETS, string>;
}

function getNonce(): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';

  for (let index = 0; index < 32; index += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}
