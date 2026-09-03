import type { Meta, StoryObj } from '@storybook/react';
import { DynamicZoneBuilder } from './dynamic-zone-builder';

const meta: Meta<typeof DynamicZoneBuilder> = {
  title: 'Web App/DynamicZoneBuilder',
  component: DynamicZoneBuilder,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof DynamicZoneBuilder>;

export const Default: Story = {
  args: {
    initialBlocks: [],
    onSave: (blocks) => console.log('Saved blocks:', blocks),
  },
};
