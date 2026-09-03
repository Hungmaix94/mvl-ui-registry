import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './avatar';

const meta = {
  title: 'web-app/ui/Avatar',
  component: Avatar as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
