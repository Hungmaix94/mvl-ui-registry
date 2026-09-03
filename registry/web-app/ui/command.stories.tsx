import type { Meta, StoryObj } from '@storybook/react';
import { Command } from './command';

const meta = {
  title: 'web-app/ui/Command',
  component: Command as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
