import type { Meta, StoryObj } from '@storybook/react';
import Switch from './Switch';

const meta: Meta<typeof Switch> = {
  title: 'Web App/Form Controls/Switch',
  component: Switch,
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  args: {
    size: 'medium',
  },
};

export const Checked: Story = {
  args: {
    checked: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Switch size="small" />
      <Switch size="medium" />
      <Switch size="large" />
    </div>
  ),
};
