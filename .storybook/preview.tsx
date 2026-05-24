import type { Preview } from '@storybook/react-vite';
import type { CSSProperties } from 'react';

import '../src/webview/app/styles.css';

const vscodeApi = {
  postMessage(message: unknown) {
    console.info('[storybook:vscode.postMessage]', message);
  }
};

Object.assign(globalThis, {
  acquireVsCodeApi: () => vscodeApi
});

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
  '--vscode-editor-font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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

export default preview;
