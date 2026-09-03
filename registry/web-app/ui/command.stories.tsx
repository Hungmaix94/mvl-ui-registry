import type { Meta, StoryObj } from '@storybook/react';
import { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from './command';

const meta: Meta<typeof Command> = {
  title: 'Web App/Command/Command',
  component: Command,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Command>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
