import type { Meta, StoryObj } from '@storybook/react';
import { InputOtp } from './input-otp';

const meta = {
  title: 'web-app/ui/InputOtp',
  component: InputOtp as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof InputOtp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
