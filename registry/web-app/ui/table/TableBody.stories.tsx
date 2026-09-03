import type { Meta, StoryObj } from '@storybook/react';
import { TableBody } from './TableBody';

const meta: Meta<typeof TableBody> = {
  title: 'Web App/table/TableBody',
  component: TableBody,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof TableBody>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
