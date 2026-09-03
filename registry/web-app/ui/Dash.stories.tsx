import type { Meta, StoryObj } from '@storybook/react';
import { Dash } from './Dash';

const meta: Meta<typeof Dash> = {
  title: 'Web App/Dash/Dash',
  component: Dash,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Dash>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
