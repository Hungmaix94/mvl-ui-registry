import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumb } from './breadcrumb';

const meta = {
  title: 'web-app/ui/Breadcrumb',
  component: Breadcrumb as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
