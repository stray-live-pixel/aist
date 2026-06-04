import type { Meta, StoryObj } from '@storybook/react-vite';
import { Info, ListChecks, Settings } from 'lucide-react';

import { storyTools } from '../../storybook/fixtures';
import { AistAnimatedLogo, AistBrand, AistLogo } from './AistLogo';
import { IconButton } from './IconButton';
import styles from './SharedUi.stories.module.scss';
import { ToolIcon, getToolLabel } from './ToolIcon';
import { Badge } from './badge';
import { Callout } from './callout';
import { CollapsibleSection } from './collapsible-section';
import { KeyValueGrid } from './key-value-grid';
import { KeyboardShortcut } from './keyboard-shortcut';
import { LogBlock } from './log-block';

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

export const DataAndCuts: Story = {
  render: () => (
    <div className={styles.stack}>
      <Callout
        tone="accent"
        icon={<Info size={15} />}
        title="Standard chat is primary"
        actions={<Badge tone="accent">Live</Badge>}
      >
        Use the full chat for the agent conversation. Logs stay as plain text diagnostics.
      </Callout>
      <KeyValueGrid
        items={[
          { key: 'branch', label: 'Branch', value: 'aist/task/example' },
          { key: 'container', label: 'Container', value: 'aist-agent-42' },
          { key: 'status', label: 'Status', value: 'running_agent', tone: 'accent' }
        ]}
      />
      <CollapsibleSection
        title="Daemon logs"
        icon={<ListChecks size={14} />}
        meta={<Badge>12 events</Badge>}
        collapsedPreview="Logs are collapsed by default and keep the page calm."
      >
        <LogBlock
          compact
          label="Event tail"
          value={'10:00:00 Session created\n10:00:02 Container started\n10:00:04 Agent is working'}
          copyLabel="Copy"
        />
      </CollapsibleSection>
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
