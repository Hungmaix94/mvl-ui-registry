import type { Meta, StoryObj } from '@storybook/react';
import { VirtualTreeTable } from './VirtualTreeTable';

const meta: Meta<typeof VirtualTreeTable> = {
  title: 'Web App/table-tree/VirtualTreeTable',
  component: VirtualTreeTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof VirtualTreeTable>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
