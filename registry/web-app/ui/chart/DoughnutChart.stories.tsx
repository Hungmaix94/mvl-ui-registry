import type { Meta, StoryObj } from '@storybook/react';
import { DoughnutChart } from './DoughnutChart';

const meta: Meta<typeof DoughnutChart> = {
  title: 'Web App/chart/DoughnutChart',
  component: DoughnutChart,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DoughnutChart>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
