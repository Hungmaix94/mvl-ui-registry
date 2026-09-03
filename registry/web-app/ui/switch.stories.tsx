import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './switch';

const meta = {
  title: 'web-app/ui/Switch',
  component: Switch as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
