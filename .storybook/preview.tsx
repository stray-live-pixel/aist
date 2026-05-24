import type { Preview } from '@storybook/react-vite';
import type { CSSProperties } from 'react';

import '../src/webview/app/styles.css';

const VSCODE_EDITOR_FONT_VARIABLE = '--vscode-editor-font-family';
const VSCODE_EDITOR_FONT_FALLBACK = "Menlo, Monaco, 'Courier New', monospace";

const vscodeApi = {
  postMessage(message: unknown) {
    console.info('[storybook:vscode.postMessage]', message);
  }
};

Object.assign(globalThis, {
  acquireVsCodeApi: () => vscodeApi,
  __AIST_ASSETS__: {
    logo: '/assets/logo.png',
    logoAnimated: '/assets/logo-animated.png'
  }
});

const vscodeEditorFontFamily = readCssVariable(VSCODE_EDITOR_FONT_VARIABLE) || VSCODE_EDITOR_FONT_FALLBACK;

const vscodeDarkTheme = {
  colorScheme: 'dark',
  '--agent-border': 'color-mix(in srgb, #cccccc 18%, transparent)',
  '--agent-input-border': '#3c3c3c',
  '--vscode-button-background': '#0e639c',
  '--vscode-button-border': 'transparent',
  '--vscode-button-foreground': '#ffffff',
  '--vscode-button-hoverBackground': '#1177bb',
  '--vscode-button-secondaryBackground': '#313131',
  '--vscode-button-secondaryForeground': '#cccccc',
  '--vscode-button-secondaryHoverBackground': '#3c3c3c',
  '--vscode-charts-blue': '#3794ff',
  '--vscode-descriptionForeground': '#9d9d9d',
  '--vscode-dropdown-background': '#252526',
  '--vscode-dropdown-foreground': '#cccccc',
  '--vscode-editor-background': '#1e1e1e',
  '--vscode-editor-font-family': vscodeEditorFontFamily,
  '--vscode-editor-inactiveSelectionBackground': '#37373d',
  '--vscode-errorForeground': '#f48771',
  '--vscode-focusBorder': '#007fd4',
  '--vscode-foreground': '#cccccc',
  '--vscode-input-background': '#3c3c3c',
  '--vscode-input-border': '#3c3c3c',
  '--vscode-input-foreground': '#cccccc',
  '--vscode-input-placeholderForeground': '#a6a6a6',
  '--vscode-list-activeSelectionBackground': '#04395e',
  '--vscode-list-activeSelectionForeground': '#ffffff',
  '--vscode-list-focusBackground': '#062f4a',
  '--vscode-list-hoverBackground': '#2a2d2e',
  '--vscode-sideBar-background': '#252526',
  '--vscode-testing-iconPassed': '#73c991',
  '--vscode-textCodeBlock-background': '#2d2d2d',
  '--vscode-textLink-foreground': '#4daafc'
} satisfies CSSProperties;

const preview: Preview = {
  decorators: [
    (Story) => (
      <div
        className="min-h-screen bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)]"
        style={vscodeDarkTheme}
      >
        <Story />
      </div>
    )
  ],
  parameters: {
    docs: {
      story: {
        inline: true
      }
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    backgrounds: {
      default: 'VS Code Dark',
      values: [{ name: 'VS Code Dark', value: '#1e1e1e' }]
    }
  }
};

/**
 * Синхронизирует Storybook iframe с webview расширения.
 *
 * Использование: файл preview подключается Storybook автоматически.
 * Расширение задает основной шрифт через `font-family: var(--vscode-editor-font-family)`
 * в `src/webview/app/styles.css`, поэтому Storybook объявляет эту же переменную и
 * применяет ее к контейнерам, которые находятся вне React-декоратора.
 */
const storybookBackgroundStyle = document.createElement('style');
storybookBackgroundStyle.textContent = `
  html,
  body,
  #storybook-root {
    min-height: 100%;
    background: ${vscodeDarkTheme['--vscode-editor-background']};
    ${VSCODE_EDITOR_FONT_VARIABLE}: ${vscodeEditorFontFamily};
    font-family: var(${VSCODE_EDITOR_FONT_VARIABLE});
  }

  body {
    color: ${vscodeDarkTheme['--vscode-foreground']};
  }
`;
document.head.appendChild(storybookBackgroundStyle);

export default preview;

function readCssVariable(name: string) {
  return readCssVariableFromDocument(document, name) || readCssVariableFromParent(name);
}

function readCssVariableFromParent(name: string) {
  try {
    return window.parent && window.parent !== window ? readCssVariableFromDocument(window.parent.document, name) : '';
  } catch {
    return '';
  }
}

function readCssVariableFromDocument(targetDocument: Document, name: string) {
  return (
    getComputedStyle(targetDocument.documentElement).getPropertyValue(name).trim() ||
    getComputedStyle(targetDocument.body).getPropertyValue(name).trim()
  );
}
