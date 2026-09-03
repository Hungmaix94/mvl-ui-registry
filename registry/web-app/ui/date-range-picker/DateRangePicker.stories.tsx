import type { Meta, StoryObj } from '@storybook/react';
import { DateRangePicker } from './DateRangePicker';

const meta: Meta<typeof DateRangePicker> = {
  title: 'Web App/date-range-picker/DateRangePicker',
  component: DateRangePicker,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DateRangePicker>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
