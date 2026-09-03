import type { Meta, StoryObj } from '@storybook/react';
import { Form } from './form';

const meta = {
  title: 'web-app/ui/Form',
  component: Form as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
