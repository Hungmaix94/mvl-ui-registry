import type { Meta, StoryObj } from '@storybook/react';
import { RateInput } from './rate-input';

const meta = {
  title: 'web-app/ui/RateInput',
  component: RateInput as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof RateInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
