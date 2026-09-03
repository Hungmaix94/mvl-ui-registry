import type { Meta, StoryObj } from '@storybook/react';
import { TextArea } from './text-area';

const meta = {
  title: 'web-app/ui/TextArea',
  component: TextArea as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
