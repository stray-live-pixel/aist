import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/webview/**/*.stories.@(ts|tsx)'],
  staticDirs: [{ from: '../assets', to: '/assets' }],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  }
};

export default config;
