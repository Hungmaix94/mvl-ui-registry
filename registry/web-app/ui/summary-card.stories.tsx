import type { Meta, StoryObj } from '@storybook/react';
import { SummaryCard } from './summary-card';

const meta = {
  title: 'web-app/ui/SummaryCard',
  component: SummaryCard as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof SummaryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
