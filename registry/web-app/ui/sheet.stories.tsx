import type { Meta, StoryObj } from '@storybook/react';
import { Sheet } from './sheet';

const meta = {
  title: 'web-app/ui/Sheet',
  component: Sheet as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
