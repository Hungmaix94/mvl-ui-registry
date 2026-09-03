import type { Meta, StoryObj } from '@storybook/react';
import { Calendar, CalendarDayButton } from './calendar';

const meta: Meta<typeof Calendar> = {
  title: 'Web App/date-single-picker/Calendar',
  component: Calendar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Calendar>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
