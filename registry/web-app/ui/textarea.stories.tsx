import type { Meta, StoryObj } from '@storybook/react';
import { TextArea } from './textarea';

const meta: Meta<typeof TextArea> = {
  title: 'Web App/Form Controls/TextArea',
  component: TextArea,
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
type Story = StoryObj<typeof TextArea>;

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
