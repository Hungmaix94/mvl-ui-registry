import type { Meta, StoryObj } from '@storybook/react';
import { DEFAULT_SIDEBAR_STATE } from './sidebar';

const meta: Meta<typeof DEFAULT_SIDEBAR_STATE> = {
  title: 'Web App/sidebar/DEFAULT_SIDEBAR_STATE',
  component: DEFAULT_SIDEBAR_STATE,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DEFAULT_SIDEBAR_STATE>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
