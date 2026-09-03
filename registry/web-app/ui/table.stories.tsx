import type { Meta, StoryObj } from '@storybook/react';
import { Table } from './table';

const meta = {
  title: 'web-app/ui/Table',
  component: Table as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
