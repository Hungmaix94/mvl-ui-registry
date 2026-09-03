import type { Meta, StoryObj } from '@storybook/react';
import { TextInput } from './input';

const meta: Meta<typeof TextInput> = {
  title: 'Web App/Form Controls/TextInput',
  component: TextInput,
  tags: ['autodocs'],
  args: {
    placeholder: 'Enter text here...',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    hasError: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    value: 'Some predefined text',
  },
};

export const WithError: Story = {
  args: {
    hasError: true,
    defaultValue: 'Invalid input',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'Disabled input',
  },
};
