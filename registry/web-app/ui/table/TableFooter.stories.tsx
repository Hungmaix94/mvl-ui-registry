import type { Meta, StoryObj } from '@storybook/react';
import { TableFooter } from './TableFooter';

const meta: Meta<typeof TableFooter> = {
  title: 'Web App/table/TableFooter',
  component: TableFooter,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof TableFooter>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
