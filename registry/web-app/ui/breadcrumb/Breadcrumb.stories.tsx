import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from './Breadcrumb';

const meta: Meta<typeof Breadcrumb> = {
  title: 'Web App/breadcrumb/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

export const Default: Story = {
  args: {
    // Add default args here
  },
};
