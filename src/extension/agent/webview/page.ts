import type { AistLogger } from '../../shared/logger';
import type { WebviewSurface } from '../types';

/**
 * Отправляет webview команду переключения страницы chat/settings.
 *
 * Логирование доставки оставлено рядом с postMessage, чтобы все page-сообщения
 * имели одинаковый формат diagnostics и контроллер не содержал promise-шум.
 */
export function postWebviewPage(surface: WebviewSurface, page: 'chat' | 'settings', logger: AistLogger): void {
  void surface.webview.postMessage({ type: 'page', page }).then(
    (delivered) => {
      logger.info('Page posted to webview', {
        surfaceId: surface.id,
        kind: surface.kind,
        page,
        delivered
      });
    },
    (error) => {
      logger.error('Failed to post page to webview', error);
    }
  );
}
