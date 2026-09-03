import type { Meta, StoryObj } from '@storybook/react';
import { TimesheetTable } from './timesheet-table';

const meta = {
  title: 'web-app/ui/TimesheetTable',
  component: TimesheetTable as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof TimesheetTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
