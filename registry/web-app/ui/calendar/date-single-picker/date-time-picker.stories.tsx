import type { Meta, StoryObj } from '@storybook/react';
import { DateTimePicker } from './date-time-picker';

const meta: Meta<typeof DateTimePicker> = {
  title: 'Web App/date-single-picker/DateTimePicker',
  component: DateTimePicker,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DateTimePicker>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
