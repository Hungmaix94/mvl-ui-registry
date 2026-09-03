import type { Meta, StoryObj } from '@storybook/react';
import { Text } from './text';

const meta: Meta<typeof Text> = {
  title: 'Web App/Text/Text',
  component: Text,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Text>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
