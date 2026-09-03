import type { Meta, StoryObj } from '@storybook/react';
import { TreeSelect } from './tree-select';

const meta = {
  title: 'web-app/ui/TreeSelect',
  component: TreeSelect as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof TreeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
