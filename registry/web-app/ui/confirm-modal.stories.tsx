import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmModal } from './confirm-modal';

const meta: Meta<typeof ConfirmModal> = {
  title: 'Web App/ConfirmModal/ConfirmModal',
  component: ConfirmModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ConfirmModal>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
