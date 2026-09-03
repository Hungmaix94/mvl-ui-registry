import type { Meta, StoryObj } from '@storybook/react';
import { TimePicker } from './time-picker';

const meta = {
  title: 'web-app/ui/TimePicker',
  component: TimePicker as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof TimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
