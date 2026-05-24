import type { Meta, StoryObj } from '@storybook/react-vite';
import { Settings } from 'lucide-react';

import { storyTools } from '../../storybook/fixtures';
import { AistAnimatedLogo, AistBrand, AistLogo } from './AistLogo';
import { IconButton } from './IconButton';
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
    <div className="flex items-center gap-6 text-[var(--vscode-foreground)]">
      <AistLogo />
      <AistAnimatedLogo />
      <AistLogo className="text-[var(--vscode-descriptionForeground)]" />
      <AistLogo className="text-[var(--vscode-textLink-foreground)]" />
    </div>
  )
};

export const IconButtons: Story = {
  render: () => (
    <div className="flex items-center gap-2">
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
    <div className="grid gap-3 text-[var(--vscode-foreground)]">
      <KeyboardShortcut label="Send" keys={['⌘', '↵']} />
      <KeyboardShortcut label="Send" keys={['Ctrl', '↵']} />
      <KeyboardShortcut keys={['Shift', 'Tab']} />
    </div>
  )
};

export const ToolIcons: Story = {
  render: () => (
    <div className="grid min-w-72 gap-2">
      {storyTools.map((tool) => (
        <div key={tool} className="flex items-center gap-2 text-sm">
          <span className="tool-icon-pill">
            <ToolIcon name={tool} size={14} />
          </span>
          <span>{getToolLabel(tool)}</span>
          <code className="ml-auto text-xs text-[var(--vscode-descriptionForeground)]">{tool}</code>
        </div>
      ))}
    </div>
  )
};
