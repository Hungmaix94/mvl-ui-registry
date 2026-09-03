import type { Meta, StoryObj } from '@storybook/react';
import { CurrencyInput } from './currency-input';

const meta = {
  title: 'web-app/ui/CurrencyInput',
  component: CurrencyInput as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof CurrencyInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
