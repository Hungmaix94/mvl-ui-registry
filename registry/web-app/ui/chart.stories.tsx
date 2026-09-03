import type { Meta, StoryObj } from '@storybook/react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle } from './chart';

const meta: Meta<typeof ChartContainer> = {
  title: 'Web App/ChartContainer/ChartContainer',
  component: ChartContainer,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ChartContainer>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
