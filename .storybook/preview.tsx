import type { Preview } from '@storybook/react-vite';

import '../src/webview/app/styles.css';

const vscodeApi = {
  postMessage(message: unknown) {
    console.info('[storybook:vscode.postMessage]', message);
  }
};

Object.assign(globalThis, {
  acquireVsCodeApi: () => vscodeApi
});

const preview: Preview = {
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-[var(--vscode-editor-background)] text-[var(--vscode-foreground)]">
        <Story />
      </div>
    )
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    backgrounds: {
      disable: true
    }
  }
};

export default preview;
