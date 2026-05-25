import type { Meta, StoryObj } from '@storybook/react-vite';
import { Settings } from 'lucide-react';

import { storyTools } from '../../storybook/fixtures';
import { AistAnimatedLogo, AistBrand, AistLogo } from './AistLogo';
import { IconButton } from './IconButton';
import styles from './SharedUi.stories.module.scss';
import { ToolIcon, getToolLabel } from './ToolIcon';
import { KeyboardShortcut } from './keyboard-shortcut';

const meta = {
  title: 'Shared/UI',
  parameters: {
    layout: 'centered'
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const AistBrandBlock: Story = {
  render: () => <AistBrand />
};

export const AistAnimatedBrandBlock: Story = {
  render: () => <AistBrand animated />
};

export const AistLogos: Story = {
  render: () => (
    <div className={styles.logoRow}>
      <AistLogo />
      <AistAnimatedLogo />
      <AistLogo className={styles.mutedLogo} />
      <AistLogo className={styles.linkLogo} />
    </div>
  )
};

export const IconButtons: Story = {
  render: () => (
    <div className={styles.iconButtonRow}>
      <IconButton title="Settings" onClick={() => undefined}>
        <Settings size={15} />
      </IconButton>
      <IconButton title="Disabled settings" disabled onClick={() => undefined}>
        <Settings size={15} />
      </IconButton>
    </div>
  )
};

export const KeyboardShortcuts: Story = {
  render: () => (
    <div className={styles.shortcutGrid}>
      <KeyboardShortcut label="Send" keys={['⌘', '↵']} />
      <KeyboardShortcut label="Send" keys={['Ctrl', '↵']} />
      <KeyboardShortcut keys={['Shift', 'Tab']} />
    </div>
  )
};

export const ToolIcons: Story = {
  render: () => (
    <div className={styles.toolIconGrid}>
      {storyTools.map((tool) => (
        <div key={tool} className={styles.toolIconRow}>
          <span className={styles.toolIconPill}>
            <ToolIcon name={tool} size={14} />
          </span>
          <span>{getToolLabel(tool)}</span>
          <code className={styles.toolIconCode}>{tool}</code>
        </div>
      ))}
    </div>
  )
};
