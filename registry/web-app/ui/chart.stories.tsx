import type { Meta, StoryObj } from '@storybook/react';
import { Chart } from './chart';

const meta = {
  title: 'web-app/ui/Chart',
  component: Chart as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Chart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
