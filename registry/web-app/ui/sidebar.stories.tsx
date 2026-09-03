import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar } from './sidebar';

const meta = {
  title: 'web-app/ui/Sidebar',
  component: Sidebar as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
