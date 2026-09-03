import type { Meta, StoryObj } from '@storybook/react';
import { Text } from './text';

const meta = {
  title: 'web-app/ui/Text',
  component: Text as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
