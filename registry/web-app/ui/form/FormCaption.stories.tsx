import type { Meta, StoryObj } from '@storybook/react';
import { FormCaption } from './FormCaption';

const meta: Meta<typeof FormCaption> = {
  title: 'Web App/form/FormCaption',
  component: FormCaption,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof FormCaption>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
