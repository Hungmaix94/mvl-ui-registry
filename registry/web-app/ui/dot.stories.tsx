import type { Meta, StoryObj } from '@storybook/react';
import { Dot } from './dot';

const meta = {
  title: 'web-app/ui/Dot',
  component: Dot as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Dot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
