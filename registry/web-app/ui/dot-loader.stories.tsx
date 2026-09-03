import type { Meta, StoryObj } from '@storybook/react';
import { DotLoader } from './dot-loader';

const meta = {
  title: 'web-app/ui/DotLoader',
  component: DotLoader as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof DotLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
