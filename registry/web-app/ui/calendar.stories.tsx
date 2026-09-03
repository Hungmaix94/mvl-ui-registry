import type { Meta, StoryObj } from '@storybook/react';
import { Calendar } from './calendar';

const meta = {
  title: 'web-app/ui/Calendar',
  component: Calendar as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
