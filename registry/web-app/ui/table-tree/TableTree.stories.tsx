import type { Meta, StoryObj } from '@storybook/react';
import { TableTree } from './TableTree';

const meta: Meta<typeof TableTree> = {
  title: 'Web App/table-tree/TableTree',
  component: TableTree,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof TableTree>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
