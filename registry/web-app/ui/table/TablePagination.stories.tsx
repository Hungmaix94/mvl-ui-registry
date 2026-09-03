import type { Meta, StoryObj } from '@storybook/react';
import { TablePagination } from './TablePagination';

const meta: Meta<typeof TablePagination> = {
  title: 'Web App/table/TablePagination',
  component: TablePagination,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof TablePagination>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
