import type { Meta, StoryObj } from '@storybook/react';
import { TableHeader } from './TableHeader';

const meta: Meta<typeof TableHeader> = {
  title: 'Web App/table/TableHeader',
  component: TableHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof TableHeader>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
