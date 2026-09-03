import type { Meta, StoryObj } from '@storybook/react';
import { Dash } from './Dash';

const meta = {
  title: 'web-app/ui/Dash',
  component: Dash as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Dash>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
