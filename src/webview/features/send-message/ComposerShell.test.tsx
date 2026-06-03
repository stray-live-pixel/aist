import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { I18nProvider } from '../../shared/i18n';
import { ComposerShell } from './Composer/ComposerShell';

/**
 * Что это: regression-тесты разметки shell Composer.
 * Зачем нужно: поле ввода легко сломать перестановкой компактных кнопок вокруг textarea.
 * Какую продуктовую проблему решает: скрепка остаётся в нижней панели, а не занимает место в строке ввода prompt.
 */
describe('ComposerShell', () => {
  it('keeps attach control in bottom actions before send controls', () => {
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <ComposerShell
          busy={false}
          floating={false}
          minimized={false}
          gradientWhileBusy={false}
          fallback="No settings"
          placeholder="Ask AIST"
          prompt=""
          footer={<span title="Footer meta">Meta</span>}
          actions={
            <>
              <span title="Shortcut">Shortcut</span>
              <button type="button" title="Send">
                Send
              </button>
            </>
          }
        />
      </I18nProvider>
    );

    const textareaIndex = html.indexOf('<textarea');
    const attachIndex = html.indexOf('title="Attach files for analysis"');
    const footerMetaIndex = html.indexOf('title="Footer meta"');
    const shortcutIndex = html.indexOf('title="Shortcut"');
    const sendIndex = html.indexOf('title="Send"');

    // Скрепка должна открывать нижнюю строку: перед footer-метаданными и правыми send controls.
    expect(textareaIndex).toBeGreaterThanOrEqual(0);
    expect(attachIndex).toBeGreaterThan(textareaIndex);
    expect(attachIndex).toBeLessThan(footerMetaIndex);
    expect(footerMetaIndex).toBeLessThan(shortcutIndex);
    expect(shortcutIndex).toBeLessThan(sendIndex);
  });
});
