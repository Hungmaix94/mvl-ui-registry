import type { Meta, StoryObj } from '@storybook/react';
import { Dialog } from './dialog';

const meta = {
  title: 'web-app/ui/Dialog',
  component: Dialog as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
