import type { Meta, StoryObj } from '@storybook/react';
import { DatePicker } from './date-picker';

const meta: Meta<typeof DatePicker> = {
  title: 'Web App/date-single-picker/DatePicker',
  component: DatePicker,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
