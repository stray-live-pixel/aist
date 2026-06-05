import type { Meta, StoryObj } from '@storybook/react-vite';
import { Eye, Search } from 'lucide-react';

import { Button } from '../button';
import { TextField } from './TextField';

const meta = {
  title: 'Shared/Design System/TextField',
  component: TextField,
  parameters: { layout: 'centered' }
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => <TextField label="Project name" placeholder="aist" hint="Use a readable workspace name." />
};

export const WithIcon: Story = {
  render: () => <TextField label="Search" placeholder="Find files" leadingIcon={<Search size={15} />} />
};

export const WithError: Story = {
  render: () => <TextField label="API key" defaultValue="sk-" error="API key is too short." />
};

export const WithTrailingAction: Story = {
  render: () => (
    <TextField
      label="Secret"
      type="password"
      defaultValue="secret-token"
      trailingSlot={
        <Button size="sm" variant="ghost" leadingIcon={<Eye size={14} />}>
          Show
        </Button>
      }
    />
  )
};
