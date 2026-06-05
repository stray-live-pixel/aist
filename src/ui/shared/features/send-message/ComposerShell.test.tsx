import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { I18nProvider } from '../../i18n';
import { ComposerShell } from './Composer/ComposerShell';

/**
 * Что это: regression-тесты разметки shell Composer.
 * Зачем нужно: поле ввода легко сломать перестановкой компактных кнопок вокруг textarea.
 * Какую продуктовую проблему решает: скрепка, Turbo tools, модель и разрешения остаются в ожидаемом порядке без обрезания controls.
 */
describe('ComposerShell', () => {
  it('keeps attach, turbo tools, model and permissions controls before send controls', () => {
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
          footerControls={<button title="Turbo tools">Turbo</button>}
          footer={
            <>
              <button title="Model settings">Model</button>
              <button title="Permissions">Permissions</button>
            </>
          }
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
    const turboIndex = html.indexOf('title="Turbo tools"');
    const modelIndex = html.indexOf('title="Model settings"');
    const permissionsIndex = html.indexOf('title="Permissions"');
    const shortcutIndex = html.indexOf('title="Shortcut"');
    const sendIndex = html.indexOf('title="Send"');

    // Нижняя строка должна читаться слева направо: скрепка, Turbo tools, модель, разрешения, затем send controls.
    expect(textareaIndex).toBeGreaterThanOrEqual(0);
    expect(attachIndex).toBeGreaterThan(textareaIndex);
    expect(attachIndex).toBeLessThan(turboIndex);
    expect(turboIndex).toBeLessThan(modelIndex);
    expect(modelIndex).toBeLessThan(permissionsIndex);
    expect(permissionsIndex).toBeLessThan(shortcutIndex);
    expect(shortcutIndex).toBeLessThan(sendIndex);
  });
});
