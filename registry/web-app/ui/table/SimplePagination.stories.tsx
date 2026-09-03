import type { Meta, StoryObj } from '@storybook/react';
import { SimplePagination } from './SimplePagination';

const meta: Meta<typeof SimplePagination> = {
  title: 'Web App/table/SimplePagination',
  component: SimplePagination,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof SimplePagination>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
