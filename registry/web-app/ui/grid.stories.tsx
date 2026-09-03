import type { Meta, StoryObj } from '@storybook/react';
import { Grid } from './grid';

const meta = {
  title: 'web-app/ui/Grid',
  component: Grid as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
