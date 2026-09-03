import type { Meta, StoryObj } from '@storybook/react';
import { TableActionMenu } from './TableActionMenu';

const meta: Meta<typeof TableActionMenu> = {
  title: 'Web App/table/TableActionMenu',
  component: TableActionMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof TableActionMenu>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
