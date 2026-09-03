import type { Meta, StoryObj } from '@storybook/react';
import { TableNoData } from './TableNoData';

const meta: Meta<typeof TableNoData> = {
  title: 'Web App/table/TableNoData',
  component: TableNoData,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof TableNoData>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
