import type { Meta, StoryObj } from '@storybook/react';
import { PhoneInput } from './PhoneInput';

const meta: Meta<typeof PhoneInput> = {
  title: 'Web App/phone-input/PhoneInput',
  component: PhoneInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof PhoneInput>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
