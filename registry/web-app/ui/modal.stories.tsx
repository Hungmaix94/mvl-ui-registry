import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './modal';

const meta: Meta<typeof Modal> = {
  title: 'Web App/Modal/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
