import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip } from './tooltip';

const meta = {
  title: 'web-app/ui/Tooltip',
  component: Tooltip as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
