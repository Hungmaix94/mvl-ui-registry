import type { Meta, StoryObj } from '@storybook/react';
import { TableEmpty } from './TableEmpty';

const meta: Meta<typeof TableEmpty> = {
  title: 'Web App/table/TableEmpty',
  component: TableEmpty,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof TableEmpty>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
