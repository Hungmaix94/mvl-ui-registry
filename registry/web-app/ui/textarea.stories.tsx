import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './textarea';

const meta: Meta<typeof Textarea> = {
  title: 'Web App/Form Controls/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: {
    placeholder: 'Type your message here.',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    hasError: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {};

export const WithValue: Story = {
  args: {
    value: 'This is a pre-filled textarea.\nIt can span multiple lines.',
  },
};

export const WithError: Story = {
  args: {
    hasError: true,
    defaultValue: 'This textarea has an error state.',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'This textarea is disabled and cannot be edited.',
  },
};
