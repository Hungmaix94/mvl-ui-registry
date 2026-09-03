import type { Meta, StoryObj } from '@storybook/react';
import { CursorActionMenuOverlay } from './CursorActionMenuOverlay';

const meta: Meta<typeof CursorActionMenuOverlay> = {
  title: 'Web App/table/CursorActionMenuOverlay',
  component: CursorActionMenuOverlay,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof CursorActionMenuOverlay>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
