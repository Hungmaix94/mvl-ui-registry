import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from './tabs';

const meta = {
  title: 'web-app/ui/Tabs',
  component: Tabs as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
