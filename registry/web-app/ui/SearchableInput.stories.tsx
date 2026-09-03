import type { Meta, StoryObj } from '@storybook/react';
import { Searchableinput } from './SearchableInput';

const meta = {
  title: 'web-app/ui/Searchableinput',
  component: Searchableinput as any,
  tags: ['autodocs'],
  argTypes: {},
} satisfies Meta<typeof Searchableinput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
