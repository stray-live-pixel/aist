import { describe, expect, it } from 'vitest';

import packageJson from '../../../../package.json';
import { AGENT_CHAT_EDITOR_VIEW_TYPE } from './chatEditorViewType';

/**
 * Проверяет manifest расширения для editor-вкладок чата.
 *
 * Восстановленные VS Code webview panels активируют расширение только через
 * onWebviewPanel:<viewType>. Если событие убрать, чат в основной области
 * редактора останется в вечной загрузке до ручного открытия sidebar.
 */
describe('agent chat webview activation events', () => {
  it('activates the extension when VS Code restores an editor chat tab', () => {
    expect(packageJson.activationEvents).toContain(`onWebviewPanel:${AGENT_CHAT_EDITOR_VIEW_TYPE}`);
  });
});
