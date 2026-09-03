import type { Meta, StoryObj } from '@storybook/react';
import { RateInput } from './RateInput';

const meta: Meta<typeof RateInput> = {
  title: 'Web App/rate-input/RateInput',
  component: RateInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof RateInput>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
