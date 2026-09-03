import type { Meta, StoryObj } from '@storybook/react';
import { BLOCK_CATALOG, DynamicZoneBuilder } from './dynamic-zone-builder';

const meta: Meta<typeof BLOCK_CATALOG> = {
  title: 'Web App/BLOCK_CATALOG/BLOCK_CATALOG',
  component: BLOCK_CATALOG,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof BLOCK_CATALOG>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
