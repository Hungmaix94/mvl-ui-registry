import type { Meta, StoryObj } from '@storybook/react';
import { RichText } from './rich-text';

const meta = {
  title: 'web-app/ui/RichText',
  component: RichText as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof RichText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
