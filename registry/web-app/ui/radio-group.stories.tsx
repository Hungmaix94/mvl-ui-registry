import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup } from './radio-group';

const meta = {
  title: 'web-app/ui/RadioGroup',
  component: RadioGroup as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
