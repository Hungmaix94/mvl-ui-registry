import type { Meta, StoryObj } from '@storybook/react';
import { DateRangePicker } from './date-range-picker';

const meta = {
  title: 'web-app/ui/DateRangePicker',
  component: DateRangePicker as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
