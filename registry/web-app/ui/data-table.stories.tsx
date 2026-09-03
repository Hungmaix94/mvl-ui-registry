import type { Meta, StoryObj } from '@storybook/react';
import { DataTable } from './data-table';

const meta: Meta<typeof DataTable> = {
  title: 'Web App/DataTable/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DataTable>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
