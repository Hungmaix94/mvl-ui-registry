import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from './separator';

const meta: Meta<typeof Separator> = {
  title: 'Web App/Separator/Separator',
  component: Separator,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Separator>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
