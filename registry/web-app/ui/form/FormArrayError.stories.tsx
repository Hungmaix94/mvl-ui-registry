import type { Meta, StoryObj } from '@storybook/react';
import { FormArrayError } from './FormArrayError';

const meta: Meta<typeof FormArrayError> = {
  title: 'Web App/form/FormArrayError',
  component: FormArrayError,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof FormArrayError>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
