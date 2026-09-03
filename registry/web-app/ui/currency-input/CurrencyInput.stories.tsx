import type { Meta, StoryObj } from '@storybook/react';
import { CurrencyInput } from './CurrencyInput';

const meta: Meta<typeof CurrencyInput> = {
  title: 'Web App/currency-input/CurrencyInput',
  component: CurrencyInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof CurrencyInput>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
