import type { Meta, StoryObj } from '@storybook/react';
import { IconReveal } from './IconReveal';

const meta: Meta<typeof IconReveal> = {
  title: 'Web App/icon/IconReveal',
  component: IconReveal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof IconReveal>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
