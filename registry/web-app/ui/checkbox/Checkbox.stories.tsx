import type { Meta, StoryObj } from '@storybook/react';
import Checkbox from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Web App/Form Controls/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: {
    label: 'Accept terms and conditions',
  },
};

export const Indeterminate: Story = {
  args: {
    label: 'Select all',
    checked: 'indeterminate',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Cannot change this',
    disabled: true,
  },
};

export const WithError: Story = {
  args: {
    label: 'Required field',
    error: 'You must accept the terms.',
  },
};
