import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://stray-live-pixel.github.io',
  base: '/aist',
  integrations: [
    starlight({
      title: 'AIST',
      description: 'AI coding agent for VS Code with OpenRouter and ChatGPT Codex support.',
      defaultLocale: 'en',
      locales: {
        en: {
          label: 'English',
          lang: 'en',
        },
        ru: {
          label: 'Русский',
          lang: 'ru',
        },
      },
      social: {
        github: 'https://github.com/stray-live-pixel/aist',
      },
      sidebar: [
        {
          label: 'Getting started',
          autogenerate: { directory: 'getting-started' },
        },
        {
          label: 'Using AIST',
          autogenerate: { directory: 'using-aist' },
        },
        {
          label: 'Features',
          autogenerate: { directory: 'features' },
        },
        {
          label: 'Configuration',
          autogenerate: { directory: 'configuration' },
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
        },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
  ],
});
