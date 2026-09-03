import type { Meta, StoryObj } from '@storybook/react';
import { Popover } from './popover';

const meta = {
  title: 'web-app/ui/Popover',
  component: Popover as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
