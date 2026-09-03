import type { Meta, StoryObj } from '@storybook/react';
import { TableRow } from './TableRow';

const meta: Meta<typeof TableRow> = {
  title: 'Web App/table/TableRow',
  component: TableRow,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof TableRow>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
