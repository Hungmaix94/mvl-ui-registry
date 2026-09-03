import type { Meta, StoryObj } from '@storybook/react';
import { DevelopmentInProgress } from './development-in-progress';

const meta = {
  title: 'web-app/ui/DevelopmentInProgress',
  component: DevelopmentInProgress as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof DevelopmentInProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
