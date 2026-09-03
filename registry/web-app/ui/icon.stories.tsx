import type { Meta, StoryObj } from '@storybook/react';
import { Icon } from './icon';

const meta = {
  title: 'web-app/ui/Icon',
  component: Icon as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
