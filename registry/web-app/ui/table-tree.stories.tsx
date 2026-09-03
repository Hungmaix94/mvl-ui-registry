import type { Meta, StoryObj } from '@storybook/react';
import { TableTree } from './table-tree';

const meta = {
  title: 'web-app/ui/TableTree',
  component: TableTree as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof TableTree>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
