import type { Meta, StoryObj } from '@storybook/react';
import { CustomSelect } from './custom-select';

const meta: Meta<typeof CustomSelect> = {
  title: 'Web App/CustomSelect/CustomSelect',
  component: CustomSelect,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof CustomSelect>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
