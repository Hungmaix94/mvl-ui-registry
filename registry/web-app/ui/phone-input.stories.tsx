import type { Meta, StoryObj } from '@storybook/react';
import { PhoneInput } from './phone-input';

const meta = {
  title: 'web-app/ui/PhoneInput',
  component: PhoneInput as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof PhoneInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
