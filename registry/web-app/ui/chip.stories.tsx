import type { Meta, StoryObj } from '@storybook/react';
import { Chip } from './chip';

const meta = {
  title: 'web-app/ui/Chip',
  component: Chip as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
