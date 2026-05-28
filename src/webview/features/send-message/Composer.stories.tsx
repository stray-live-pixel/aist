import type { Meta, StoryObj } from '@storybook/react-vite';

import { Composer } from './Composer';
import storyStyles from './ComposerStory.module.scss';

const meta = {
  title: 'Features/Send Message/Composer',
  component: Composer,
  parameters: {
    layout: 'padded'
  },
  args: {
    chatId: 'storybook-chat'
  }
} satisfies Meta<typeof Composer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  args: {
    busy: false,
    settings: (
      <span className={storyStyles.settingsText}>Mode: Frontend · Safe access · Tokens: 12.4K · Cost: ~$0.0021</span>
    )
  }
};

export const Busy: Story = {
  args: {
    busy: true,
    settings: (
      <span className={storyStyles.settingsText}>Mode: Expert · Auto access · Tokens: 118K · Cost: ~$0.0310</span>
    )
  }
};

export const WithoutSettings: Story = {
  args: {
    busy: false
  }
};
