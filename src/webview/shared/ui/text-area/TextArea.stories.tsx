import type { Meta, StoryObj } from '@storybook/react-vite';

import { TextArea } from './TextArea';

const meta = {
  title: 'Shared/Design System/TextArea',
  component: TextArea,
  parameters: { layout: 'centered' }
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <TextArea label="Instructions" rows={5} placeholder="Write agent instructions..." hint="Markdown is supported." />
  )
};

export const WithValue: Story = {
  render: () => (
    <TextArea label="Prompt" rows={6} defaultValue="Refactor this code and explain the important changes." />
  )
};

export const WithError: Story = {
  render: () => (
    <TextArea label="Description" defaultValue="Too short" error="Description must be at least 20 characters." />
  )
};
