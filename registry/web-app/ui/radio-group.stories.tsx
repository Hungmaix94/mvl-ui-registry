import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup } from './radio-group';

const meta: Meta<typeof RadioGroup> = {
  title: 'Web App/Form Controls/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

const options = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3 (Disabled)', disabled: true },
];

export const Default: Story = {
  args: {
    id: 'rg-default',
    label: 'Select an option',
    options,
  },
};

export const Required: Story = {
  args: {
    id: 'rg-required',
    label: 'Required field',
    options,
    required: true,
  },
};

export const WithError: Story = {
  args: {
    id: 'rg-error',
    label: 'Please select an option',
    options,
    error: 'This is a required selection.',
  },
};

export const DisabledGroup: Story = {
  args: {
    id: 'rg-disabled',
    label: 'Disabled Group',
    options,
    disabled: true,
  },
};
