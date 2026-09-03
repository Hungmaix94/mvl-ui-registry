import type { Meta, StoryObj } from '@storybook/react';
import { SummaryCard } from './SummaryCard';

const meta: Meta<typeof SummaryCard> = {
  title: 'Web App/summary-card/SummaryCard',
  component: SummaryCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof SummaryCard>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
