import type { Meta, StoryObj } from '@storybook/react';
import { DotLoader } from './DotLoader';

const meta: Meta<typeof DotLoader> = {
  title: 'Web App/dot-loader/DotLoader',
  component: DotLoader,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DotLoader>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
