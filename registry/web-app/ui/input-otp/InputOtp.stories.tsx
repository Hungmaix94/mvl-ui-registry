import type { Meta, StoryObj } from '@storybook/react';
import { InputOtp } from './InputOtp';

const meta: Meta<typeof InputOtp> = {
  title: 'Web App/input-otp/InputOtp',
  component: InputOtp,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof InputOtp>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
