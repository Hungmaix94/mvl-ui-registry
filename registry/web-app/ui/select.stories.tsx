import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './select';

const meta: Meta<typeof Select> = {
  title: 'Web App/Select/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
